package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"testhub/internal/config"
	"testhub/internal/models"
)

type AIAgentService struct {
	cfg          *config.Config
	httpClient   *http.Client
	geminiKeyIdx uint64
	groqKeyIdx   uint64
}

func NewAIAgentService(cfg *config.Config) *AIAgentService {
	return &AIAgentService{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

type AIQuestionJSON struct {
	QuestionText    string `json:"question_text"`
	DifficultyLevel string `json:"difficulty_level"`
	Points          int    `json:"points"`
	Explanation     string `json:"explanation"`
	Options         []struct {
		OptionLetter string `json:"option_letter"`
		OptionText   string `json:"option_text"`
		IsCorrect    bool   `json:"is_correct"`
	} `json:"options"`
}

// GenerateQuestions generates questions using Multi-Provider with auto-key failover
func (s *AIAgentService) GenerateQuestions(ctx context.Context, req models.AIGenerateRequest) ([]models.TestQuestion, error) {
	if req.Count <= 0 {
		req.Count = 1
	}
	if req.Count > 10 {
		req.Count = 10
	}

	// 1. Try Gemini if API keys configured
	if s.cfg != nil && len(s.cfg.GeminiAPIKeys) > 0 {
		questions, err := s.generateWithGemini(ctx, req)
		if err == nil && len(questions) > 0 {
			log.Printf("[AI-Agent] Successfully generated %d questions using Google Gemini (%s)", len(questions), s.cfg.GeminiModel)
			return questions, nil
		}
		log.Printf("[AI-Agent] Gemini generation failed: %v. Attempting Groq fallback...", err)
	}

	// 2. Try Groq if API keys configured
	if s.cfg != nil && len(s.cfg.GroqAPIKeys) > 0 {
		questions, err := s.generateWithGroq(ctx, req)
		if err == nil && len(questions) > 0 {
			log.Printf("[AI-Agent] Successfully generated %d questions using Groq (%s)", len(questions), s.cfg.GroqModel)
			return questions, nil
		}
		log.Printf("[AI-Agent] Groq generation failed: %v. Falling back to local generator...", err)
	}

	// 3. Fallback to Local Deterministic Generator (Zero Downtime guarantee)
	log.Printf("[AI-Agent] Using local deterministic generator for category %s, subject %s", req.Category, req.Subject)
	return s.generateLocalDeterministic(req)
}

// -------------------------------------------------------------
// GOOGLE GEMINI PROVIDER WITH MULTI-KEY ROTATION
// -------------------------------------------------------------
func (s *AIAgentService) generateWithGemini(ctx context.Context, req models.AIGenerateRequest) ([]models.TestQuestion, error) {
	keys := s.cfg.GeminiAPIKeys
	totalKeys := len(keys)
	if totalKeys == 0 {
		return nil, fmt.Errorf("no gemini api keys configured")
	}

	prompt := s.buildPrompt(req)
	model := s.cfg.GeminiModel
	if model == "" {
		model = "gemini-1.5-flash"
	}

	startIndex := int(atomic.AddUint64(&s.geminiKeyIdx, 1) % uint64(totalKeys))

	// Try each key sequentially if rate limited (HTTP 429)
	var lastErr error
	for i := 0; i < totalKeys; i++ {
		keyIndex := (startIndex + i) % totalKeys
		apiKey := keys[keyIndex]

		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)

		reqBody := map[string]interface{}{
			"contents": []map[string]interface{}{
				{
					"parts": []map[string]interface{}{
						{"text": prompt},
					},
				},
			},
			"generationConfig": map[string]interface{}{
				"response_mime_type": "application/json",
				"temperature":        0.7,
				"thinking_config": map[string]interface{}{
					"thinking_budget": 0,
				},
			},
		}

		bodyBytes, _ := json.Marshal(reqBody)
		httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(bodyBytes))
		if err != nil {
			lastErr = err
			continue
		}
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err := s.httpClient.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("gemini key %d network error: %w", keyIndex+1, err)
			continue
		}

		respBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == 403 {
			log.Printf("[AI-Agent] Gemini Key %d rate-limited (HTTP %d). Rotating to next key...", keyIndex+1, resp.StatusCode)
			lastErr = fmt.Errorf("gemini key %d rate limited (status %d)", keyIndex+1, resp.StatusCode)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("gemini key %d error: status %d, body: %s", keyIndex+1, resp.StatusCode, string(respBytes))
			continue
		}

		// Parse Gemini response structure
		var geminiResp struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}

		if err := json.Unmarshal(respBytes, &geminiResp); err != nil {
			lastErr = fmt.Errorf("parse gemini response: %w", err)
			continue
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			lastErr = fmt.Errorf("empty gemini candidates")
			continue
		}

		rawJSON := geminiResp.Candidates[0].Content.Parts[0].Text
		questions, err := s.parseAIQuestionJSON(rawJSON, req)
		if err != nil {
			lastErr = err
			continue
		}

		return questions, nil
	}

	return nil, fmt.Errorf("all gemini keys failed: %w", lastErr)
}

// -------------------------------------------------------------
// GROQ PROVIDER WITH MULTI-KEY ROTATION
// -------------------------------------------------------------
func (s *AIAgentService) generateWithGroq(ctx context.Context, req models.AIGenerateRequest) ([]models.TestQuestion, error) {
	keys := s.cfg.GroqAPIKeys
	totalKeys := len(keys)
	if totalKeys == 0 {
		return nil, fmt.Errorf("no groq api keys configured")
	}

	prompt := s.buildPrompt(req)
	model := s.cfg.GroqModel
	if model == "" {
		model = "llama-3.3-70b-versatile"
	}

	startIndex := int(atomic.AddUint64(&s.groqKeyIdx, 1) % uint64(totalKeys))

	var lastErr error
	for i := 0; i < totalKeys; i++ {
		keyIndex := (startIndex + i) % totalKeys
		apiKey := keys[keyIndex]

		url := "https://api.groq.com/openai/v1/chat/completions"

		reqBody := map[string]interface{}{
			"model": model,
			"messages": []map[string]string{
				{
					"role":    "system",
					"content": "You are an expert exam question generator for Indonesian national assessments (CPNS, UTBK-SNBT, IQ, BUMN). Always return raw valid JSON array conforming strictly to requested schema without extra prose.",
				},
				{
					"role":    "user",
					"content": prompt,
				},
			},
			"temperature": 0.7,
			"max_tokens":  4096,
			"response_format": map[string]string{
				"type": "json_object",
			},
		}

		bodyBytes, _ := json.Marshal(reqBody)
		httpReq, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(bodyBytes))
		if err != nil {
			lastErr = err
			continue
		}
		httpReq.Header.Set("Authorization", "Bearer "+apiKey)
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err := s.httpClient.Do(httpReq)
		if err != nil {
			lastErr = fmt.Errorf("groq key %d network error: %w", keyIndex+1, err)
			continue
		}

		respBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode == 403 {
			log.Printf("[AI-Agent] Groq Key %d rate-limited (HTTP %d). Rotating to next key...", keyIndex+1, resp.StatusCode)
			lastErr = fmt.Errorf("groq key %d rate limited (status %d)", keyIndex+1, resp.StatusCode)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("groq key %d error: status %d, body: %s", keyIndex+1, resp.StatusCode, string(respBytes))
			continue
		}

		var groqResp struct {
			Choices []struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
			} `json:"choices"`
		}

		if err := json.Unmarshal(respBytes, &groqResp); err != nil {
			lastErr = fmt.Errorf("parse groq response: %w", err)
			continue
		}

		if len(groqResp.Choices) == 0 {
			lastErr = fmt.Errorf("empty groq choices")
			continue
		}

		rawJSON := groqResp.Choices[0].Message.Content
		questions, err := s.parseAIQuestionJSON(rawJSON, req)
		if err != nil {
			lastErr = err
			continue
		}

		return questions, nil
	}

	return nil, fmt.Errorf("all groq keys failed: %w", lastErr)
}

// -------------------------------------------------------------
// PROMPT BUILDER & JSON PARSER
// -------------------------------------------------------------
func (s *AIAgentService) buildPrompt(req models.AIGenerateRequest) string {
	pts := 5
	if req.Difficulty == "hard" {
		pts = 10
	} else if req.Difficulty == "easy" {
		pts = 3
	}

	return fmt.Sprintf(`Tolong buatkan %d soal ujian berkualitas tinggi dalam Bahasa Indonesia untuk:
- Kategori Tes: %s
- Topik / Mata Uji: %s
- Tingkat Kesulitan: %s (Bobot: %d poin)

Aturan Mutlak (AI_AGENT_AND_SECURITY.md):
1. Setiap soal bertipe pilihan ganda (multiple_choice) dengan 5 opsi: A, B, C, D, E.
2. Harus ada TEPAT SATU opsi dengan is_correct = true, dan 4 opsi lainnya is_correct = false.
3. KUNCI JAWABAN BENAR (is_correct = true) WAJIB DIDISTRIBUSIKAN SECARA ACAK pada opsi A, B, C, D, atau E (JANGAN SELALU di opsi A).
4. Distractor (pilihan salah) harus masuk akal, tidak konyol, dan panjang kalimat opsi relatif seimbang.
5. Sertakan penjelasan ilmiah (explanation) yang mendalam mengapa opsi tersebut benar.
6. Soal harus faktual, akurat, dan relevan dengan standar asesmen nasional di Indonesia.

Wajib kembalikan HANYA JSON object murni tanpa pembuka/penutup markdown dengan format persis seperti ini:
{
  "questions": [
    {
      "question_text": "Isi teks pertanyaan...",
      "difficulty_level": "%s",
      "points": %d,
      "explanation": "Penjelasan kunci jawaban...",
      "options": [
        {"option_letter": "A", "option_text": "Pilihan A", "is_correct": false},
        {"option_letter": "B", "option_text": "Pilihan B", "is_correct": true},
        {"option_letter": "C", "option_text": "Pilihan C", "is_correct": false},
        {"option_letter": "D", "option_text": "Pilihan D", "is_correct": false},
        {"option_letter": "E", "option_text": "Pilihan E", "is_correct": false}
      ]
    }
  ]
}`, req.Count, req.Category, req.Subject, req.Difficulty, pts, req.Difficulty, pts)
}

func (s *AIAgentService) parseAIQuestionJSON(rawText string, req models.AIGenerateRequest) ([]models.TestQuestion, error) {
	cleanText := strings.TrimSpace(rawText)
	cleanText = strings.TrimPrefix(cleanText, "```json")
	cleanText = strings.TrimPrefix(cleanText, "```")
	cleanText = strings.TrimSuffix(cleanText, "```")
	cleanText = strings.TrimSpace(cleanText)

	var items []AIQuestionJSON
	// Try parsing directly as array
	if err := json.Unmarshal([]byte(cleanText), &items); err != nil {
		// Try parsing as object {"questions": [...]}
		var obj struct {
			Questions []AIQuestionJSON `json:"questions"`
		}
		if errObj := json.Unmarshal([]byte(cleanText), &obj); errObj == nil && len(obj.Questions) > 0 {
			items = obj.Questions
		} else {
			return nil, fmt.Errorf("failed to parse AI JSON array: %w", err)
		}
	}

	var result []models.TestQuestion
	now := time.Now().UnixNano()

	for idx, item := range items {
		qID := fmt.Sprintf("ai-live-%d-%d", now, idx+1)
		diff := item.DifficultyLevel
		if diff == "" {
			diff = req.Difficulty
		}
		pts := item.Points
		if pts <= 0 {
			pts = 5
		}

		q := models.TestQuestion{
			ID:              qID,
			TestID:          "",
			QuestionNumber:  idx + 1,
			QuestionText:    item.QuestionText,
			QuestionType:    "multiple_choice",
			DifficultyLevel: diff,
			Points:          pts,
			Explanation:     item.Explanation,
			Options:         make([]models.QuestionOption, len(item.Options)),
		}

		for optIdx, opt := range item.Options {
			isCorr := opt.IsCorrect
			letter := strings.ToUpper(strings.TrimSpace(opt.OptionLetter))
			if letter == "" && optIdx < 5 {
				letter = string(rune('A' + optIdx))
			}
			q.Options[optIdx] = models.QuestionOption{
				ID:           fmt.Sprintf("opt-%s-%s", qID, strings.ToLower(letter)),
				QuestionID:   qID,
				OptionLetter: letter,
				OptionText:   opt.OptionText,
				IsCorrect:    &isCorr,
			}
		}

		if err := validateQuestion(&q); err != nil {
			return nil, err
		}

		result = append(result, q)
	}

	return result, nil
}

// -------------------------------------------------------------
// LOCAL DETERMINISTIC GENERATOR (FALLBACK)
// -------------------------------------------------------------
func (s *AIAgentService) generateLocalDeterministic(req models.AIGenerateRequest) ([]models.TestQuestion, error) {
	sampleTopics := map[string][]string{
		"cpns": {
			"Hierarki Peraturan Perundang-undangan menurut UU No. 12 Tahun 2011",
			"Integritas dan Nilai Dasar Aparatur Sipil Negara BerAKHLAK",
			"Analisis Silogisme Kategoris & Penalaran Logis Tingkat Lanjut",
			"Peran Diplomasi Indonesia dalam Konferensi Asia-Afrika 1955",
			"Pilar Negara: Wawasan Kebangsaan dan Bhinneka Tunggal Ika",
		},
		"sbmptn": {
			"Kalkulus Diferensial: Laju Perubahan Terkait dan Optimasi",
			"Literasi Bahasa: Rekonstruksi Kohesi & Koherensi Paragraf Ilmiah",
			"Kombinatorika: Permutasi Siklis dan Teori Peluang Kejadian Majemuk",
			"Fisika Terapan: Efisiensi Siklus Termodinamika Carnot",
			"Penalaran Induktif & Pola Geometrik Aljabar",
		},
		"iq": {
			"Matriks Spasial 3x3 dengan Transformasi Rotasi & Refleksi Ganda",
			"Relasi Deduktif: Penentuan Posisi Duduk Meja Bundar Kompleks",
			"Deret Bilangan Fibonacci Termodifikasi dengan Rasio Berseling",
			"Pola Irisan Geometri Tiga Dimensi pada Proyeksi Isometrik",
			"Logika Formal: Analogi Simbolik dan Silogisme Non-Verbal",
		},
		"custom": {
			"Prinsip Good Corporate Governance (GCG) di Lingkungan BUMN",
			"Manajemen Krisis dan Komunikasi Publik di Era Media Sosial",
			"Evaluasi Kelayakan Investasi Finansial (NPV, IRR, Payback Period)",
			"Mitigasi Risiko Siber dan Kepatuhan Perlindungan Data Pribadi (UU PDP)",
			"Transformasi Digital & Manajemen Perubahan Organisasi Modern",
		},
	}

	topics, exists := sampleTopics[req.Category]
	if !exists {
		topics = sampleTopics["custom"]
	}

	var result []models.TestQuestion

	pts := 5
	if req.Difficulty == "hard" {
		pts = 10
	} else if req.Difficulty == "easy" {
		pts = 3
	}

	letters := []string{"A", "B", "C", "D", "E"}

	for i := 0; i < req.Count; i++ {
		topic := topics[i%len(topics)]
		qID := fmt.Sprintf("ai-local-%d-%d", time.Now().UnixNano(), i+1)
		correctIdx := i % len(letters)
		correctLetter := letters[correctIdx]

		texts := []string{
			fmt.Sprintf("Penerapan sistematis sesuai regulasi resmi %s dengan audit kepatuhan berkala dan transparansi.", topic),
			"Penetapan kebijakan sepihak tanpa mempertimbangkan kapabilitas internal organisasi dan analisis dampak risiko.",
			"Pendelegasian seluruh proses tanpa mekanisme pengawasan independen dan indikator kinerja terukur.",
			"Penghapusan prosedur audit mutu demi percepatan tenggat waktu administratif jangka pendek.",
			"Pengabaian asas keterbukaan informasi dan penolakan evaluasi berkala oleh pemangku kepentingan.",
		}
		// Swap the correct text into the target option index
		if correctIdx != 0 {
			texts[0], texts[correctIdx] = texts[correctIdx], texts[0]
		}

		q := models.TestQuestion{
			ID:              qID,
			TestID:          "",
			QuestionNumber:  i + 1,
			QuestionText:    fmt.Sprintf("[AI Asesmen: %s] Berdasarkan prinsip baku terkait %s, manakah kesimpulan evaluatif yang paling tepat dalam konteks asesmen tingkat %s?", req.Subject, topic, req.Difficulty),
			QuestionType:    "multiple_choice",
			DifficultyLevel: req.Difficulty,
			Points:          pts,
			Explanation:     fmt.Sprintf("Analisis AI Asesmen: Opsi %s menyajikan sintesis komprehensif berdasarkan prinsip %s dan kepatuhan standar profesional.", correctLetter, topic),
			Options:         make([]models.QuestionOption, len(letters)),
		}

		for optIdx, letter := range letters {
			isCorr := (optIdx == correctIdx)
			q.Options[optIdx] = models.QuestionOption{
				ID:           fmt.Sprintf("opt-%s-%s", qID, strings.ToLower(letter)),
				QuestionID:   qID,
				OptionLetter: letter,
				OptionText:   texts[optIdx],
				IsCorrect:    &isCorr,
			}
		}

		if err := validateQuestion(&q); err != nil {
			return nil, err
		}

		result = append(result, q)
	}

	return result, nil
}

func validateQuestion(q *models.TestQuestion) error {
	if len(q.QuestionText) < 20 {
		return fmt.Errorf("validation error: question_not_empty (text too short)")
	}
	correctCount := 0
	for _, opt := range q.Options {
		if opt.IsCorrect != nil && *opt.IsCorrect {
			correctCount++
		}
	}
	if correctCount != 1 {
		return fmt.Errorf("validation error: only_one_correct violated")
	}
	if len(q.Options) < 3 || len(q.Options) > 5 {
		return fmt.Errorf("validation error: options count must be between 3 and 5")
	}
	if len(q.Explanation) < 10 {
		return fmt.Errorf("validation error: explanation_provided violated")
	}
	return nil
}
