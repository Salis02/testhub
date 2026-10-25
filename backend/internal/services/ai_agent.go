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

// GenerateQuestions generates questions using Multi-Provider with auto-key failover and batch chunking
func (s *AIAgentService) GenerateQuestions(ctx context.Context, req models.AIGenerateRequest) ([]models.TestQuestion, error) {
	return s.StreamGenerateQuestions(ctx, req, nil)
}

// StreamGenerateQuestions splits requested count into 5-question batches and streams them via onChunk callback
func (s *AIAgentService) StreamGenerateQuestions(
	ctx context.Context,
	req models.AIGenerateRequest,
	onChunk func(chunk models.AIStreamChunk) error,
) ([]models.TestQuestion, error) {
	targetCount := req.Count
	if targetCount <= 0 {
		targetCount = 1
	}
	if targetCount > 50 {
		targetCount = 50
	}

	const chunkSize = 5
	totalBatches := (targetCount + chunkSize - 1) / chunkSize

	var allQuestions []models.TestQuestion

	for batchIdx := 0; batchIdx < totalBatches; batchIdx++ {
		// Check context cancellation (client disconnected or user clicked abort)
		select {
		case <-ctx.Done():
			return allQuestions, ctx.Err()
		default:
		}

		remaining := targetCount - len(allQuestions)
		currentChunkSize := chunkSize
		if remaining < currentChunkSize {
			currentChunkSize = remaining
		}

		chunkReq := req
		chunkReq.Count = currentChunkSize

		// Alternate between Gemini and Groq as primary provider across batches
		preferGroq := (batchIdx % 2 == 1)

		questions, provider, err := s.GenerateQuestionsChunk(ctx, chunkReq, preferGroq)
		if err != nil && len(questions) == 0 {
			return allQuestions, err
		}

		// Re-number questions accurately according to overall sequence
		for i := range questions {
			questions[i].QuestionNumber = len(allQuestions) + i + 1
		}

		allQuestions = append(allQuestions, questions...)

		chunkData := models.AIStreamChunk{
			BatchIndex:     batchIdx + 1,
			TotalBatches:   totalBatches,
			CompletedCount: len(allQuestions),
			TotalCount:     targetCount,
			Provider:       provider,
			Questions:      questions,
		}

		if onChunk != nil {
			if err := onChunk(chunkData); err != nil {
				// Client aborted / stream write failed
				return allQuestions, err
			}
		}
	}

	return allQuestions, nil
}

// GenerateQuestionsChunk executes a single chunk (<=5 questions) using failover across Gemini, Groq, and Local
func (s *AIAgentService) GenerateQuestionsChunk(ctx context.Context, req models.AIGenerateRequest, preferGroq bool) ([]models.TestQuestion, string, error) {
	if preferGroq {
		if s.cfg != nil && len(s.cfg.GroqAPIKeys) > 0 {
			questions, provider, err := s.generateWithGroq(ctx, req)
			if err == nil && len(questions) > 0 {
				questions = s.ensureQuestionCount(questions, req)
				return questions, provider, nil
			}
			log.Printf("[AI-Agent] Groq primary chunk failed: %v. Attempting Gemini fallback...", err)
		}
		if s.cfg != nil && len(s.cfg.GeminiAPIKeys) > 0 {
			questions, provider, err := s.generateWithGemini(ctx, req)
			if err == nil && len(questions) > 0 {
				questions = s.ensureQuestionCount(questions, req)
				return questions, provider, nil
			}
			log.Printf("[AI-Agent] Gemini fallback chunk failed: %v. Falling back to local generator...", err)
		}
	} else {
		if s.cfg != nil && len(s.cfg.GeminiAPIKeys) > 0 {
			questions, provider, err := s.generateWithGemini(ctx, req)
			if err == nil && len(questions) > 0 {
				questions = s.ensureQuestionCount(questions, req)
				return questions, provider, nil
			}
			log.Printf("[AI-Agent] Gemini primary chunk failed: %v. Attempting Groq fallback...", err)
		}
		if s.cfg != nil && len(s.cfg.GroqAPIKeys) > 0 {
			questions, provider, err := s.generateWithGroq(ctx, req)
			if err == nil && len(questions) > 0 {
				questions = s.ensureQuestionCount(questions, req)
				return questions, provider, nil
			}
			log.Printf("[AI-Agent] Groq fallback chunk failed: %v. Falling back to local generator...", err)
		}
	}

	// Fallback to Local Deterministic Generator (Zero Downtime guarantee)
	questions, err := s.generateLocalDeterministic(req)
	return questions, "Local Generator (Fallback)", err
}

func (s *AIAgentService) ensureQuestionCount(questions []models.TestQuestion, req models.AIGenerateRequest) []models.TestQuestion {
	if len(questions) >= req.Count {
		return questions[:req.Count]
	}
	missing := req.Count - len(questions)
	log.Printf("[AI-Agent] Provider returned %d questions, needed %d. Complementing %d questions with deterministic generator...", len(questions), req.Count, missing)
	compReq := req
	compReq.Count = missing
	fallbackQuestions, _ := s.generateLocalDeterministic(compReq)
	for i, fq := range fallbackQuestions {
		fq.QuestionNumber = len(questions) + 1 + i
		questions = append(questions, fq)
	}
	return questions
}

// -------------------------------------------------------------
// GOOGLE GEMINI PROVIDER WITH MULTI-KEY ROTATION
// -------------------------------------------------------------
func (s *AIAgentService) generateWithGemini(ctx context.Context, req models.AIGenerateRequest) ([]models.TestQuestion, string, error) {
	keys := s.cfg.GeminiAPIKeys
	totalKeys := len(keys)
	if totalKeys == 0 {
		return nil, "", fmt.Errorf("no gemini api keys configured")
	}

	prompt := s.buildPrompt(req)
	model := s.cfg.GeminiModel
	if model == "" {
		model = "gemini-1.5-flash"
	}

	maxTokens := req.Count*1000 + 3000
	if maxTokens > 8192 {
		maxTokens = 8192
	}
	if maxTokens < 3000 {
		maxTokens = 3000
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
				"max_output_tokens":  maxTokens,
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
				FinishReason string `json:"finishReason"`
				Content      struct {
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

		if geminiResp.Candidates[0].FinishReason == "MAX_TOKENS" {
			log.Printf("[AI-Agent] Warning: Gemini Key %d hit MAX_TOKENS limit", keyIndex+1)
		}

		rawJSON := geminiResp.Candidates[0].Content.Parts[0].Text
		questions, err := s.parseAIQuestionJSON(rawJSON, req)
		if err != nil {
			lastErr = err
			continue
		}

		providerName := fmt.Sprintf("Google Gemini Key %d (%s)", keyIndex+1, model)
		return questions, providerName, nil
	}

	return nil, "", fmt.Errorf("all gemini keys failed: %w", lastErr)
}

// -------------------------------------------------------------
// GROQ PROVIDER WITH MULTI-KEY ROTATION
// -------------------------------------------------------------
func (s *AIAgentService) generateWithGroq(ctx context.Context, req models.AIGenerateRequest) ([]models.TestQuestion, string, error) {
	keys := s.cfg.GroqAPIKeys
	totalKeys := len(keys)
	if totalKeys == 0 {
		return nil, "", fmt.Errorf("no groq api keys configured")
	}

	prompt := s.buildPrompt(req)
	model := s.cfg.GroqModel
	if model == "" {
		model = "llama-3.3-70b-versatile"
	}

	maxTokens := req.Count*650 + 1000
	if maxTokens > 8192 {
		maxTokens = 8192
	}
	if maxTokens < 2048 {
		maxTokens = 2048
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
			"max_tokens":  maxTokens,
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

		providerName := fmt.Sprintf("Groq Key %d (%s)", keyIndex+1, model)
		return questions, providerName, nil
	}

	return nil, "", fmt.Errorf("all groq keys failed: %w", lastErr)
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

	customInstruction := ""
	if trimmed := strings.TrimSpace(req.CustomPrompt); trimmed != "" {
		if len(trimmed) > 400 {
			trimmed = trimmed[:400]
		}
		customInstruction = fmt.Sprintf("\n- PANDUAN SPESIFIK & KONTEKS PENGAJAR: %s", trimmed)
	}

	return fmt.Sprintf(`Tolong buatkan %d soal ujian berkualitas tinggi dalam Bahasa Indonesia untuk:
- Kategori Tes: %s
- Topik / Mata Uji: %s
- Tingkat Kesulitan: %s (Bobot: %d poin)%s

Aturan Mutlak (AI_AGENT_AND_SECURITY.md):
1. JUMLAH SOAL: WAJIB MENGHASILKAN TEPAT %d BUTIR SOAL DI DALAM ARRAY "questions" (Dilarang berhenti sebelum semua %d butir soal selesai dibuat).
2. Setiap soal bertipe pilihan ganda (multiple_choice) dengan 5 opsi: A, B, C, D, E.
3. Harus ada TEPAT SATU opsi dengan is_correct = true, dan 4 opsi lainnya is_correct = false.
4. KUNCI JAWABAN BENAR (is_correct = true) WAJIB DIDISTRIBUSIKAN SECARA ACAK pada opsi A, B, C, D, atau E (JANGAN SELALU di opsi A).
5. Distractor (pilihan salah) harus masuk akal, tidak konyol, dan panjang kalimat opsi relatif seimbang.
6. Sertakan penjelasan ilmiah (explanation) yang mendalam mengapa opsi tersebut benar.
7. Soal harus faktual, akurat, dan relevan dengan standar asesmen nasional di Indonesia.

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
}`, req.Count, req.Category, req.Subject, req.Difficulty, pts, customInstruction, req.Count, req.Count, req.Difficulty, pts)
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

		subjectContext := req.Subject
		if trimmed := strings.TrimSpace(req.CustomPrompt); trimmed != "" {
			if len(trimmed) > 60 {
				trimmed = trimmed[:60] + "..."
			}
			subjectContext = fmt.Sprintf("%s (%s)", req.Subject, trimmed)
		}

		q := models.TestQuestion{
			ID:              qID,
			TestID:          "",
			QuestionNumber:  i + 1,
			QuestionText:    fmt.Sprintf("[AI Asesmen: %s] Berdasarkan prinsip baku terkait %s, manakah kesimpulan evaluatif yang paling tepat dalam konteks asesmen tingkat %s?", subjectContext, topic, req.Difficulty),
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

// -------------------------------------------------------------
// AI ESSAY AUTO-GRADER (RESILIENT MULTI-PROVIDER)
// -------------------------------------------------------------
func (s *AIAgentService) GradeEssay(ctx context.Context, req models.AIEssayGradeRequest) (*models.AIEssayGradeResponse, error) {
	// 1. Try Google Gemini
	if s.cfg != nil && len(s.cfg.GeminiAPIKeys) > 0 {
		res, err := s.gradeEssayWithGemini(ctx, req)
		if err == nil && res != nil {
			res.Provider = fmt.Sprintf("Google Gemini (%s)", s.cfg.GeminiModel)
			log.Printf("[AI-Agent] Successfully evaluated essay using Gemini (%s) - Score: %d", s.cfg.GeminiModel, res.SuggestedScore)
			return res, nil
		}
		log.Printf("[AI-Agent] Gemini essay grading failed: %v. Attempting Groq fallback...", err)
	}

	// 2. Try Groq (Llama-3 / GPT-OSS)
	if s.cfg != nil && len(s.cfg.GroqAPIKeys) > 0 {
		res, err := s.gradeEssayWithGroq(ctx, req)
		if err == nil && res != nil {
			res.Provider = fmt.Sprintf("Groq (%s)", s.cfg.GroqModel)
			log.Printf("[AI-Agent] Successfully evaluated essay using Groq (%s) - Score: %d", s.cfg.GroqModel, res.SuggestedScore)
			return res, nil
		}
		log.Printf("[AI-Agent] Groq essay grading failed: %v. Falling back to local rubric...", err)
	}

	// 3. Fallback to Local Deterministic Rubric Engine
	log.Printf("[AI-Agent] Using local deterministic rubric for essay evaluation")
	res := s.gradeEssayDeterministic(req)
	return res, nil
}

func (s *AIAgentService) buildEssayPrompt(req models.AIEssayGradeRequest) string {
	refText := strings.TrimSpace(req.ReferenceKey)
	if refText == "" {
		refText = "Standar kompetensi dan kebenaran konseptual umum terkait topik pertanyaan."
	}

	return fmt.Sprintf(`Tolong bertindak sebagai asesor dan pemeriksa akademis ujian tingkat nasional di Indonesia.
Evaluasi dan berikan nilai pada jawaban esai peserta berikut berdasarkan rubrik baku:

SOAL ESAI:
%s

KUNCI ACUAN / RUBRIK JAWABAN:
%s

JAWABAN PESERTA:
%s

KRITERIA PENILAIAN OBJEKTIF (Skala 0 - 100):
1. Akurasi & Kedalaman Substansi (0 - 40 poin): Kebenaran konsep materi, data/fakta pendukung, dan kelengkapan menjawab pertanyaan.
2. Analisis & Argumentasi Kritis (0 - 30 poin): Logika penalaran, keterkaitan sebab-akibat, dan pemecahan masalah konkret.
3. Sistematika & Tata Bahasa (0 - 30 poin): Kejelasan penyampaian, koherensi antarparagraf, dan penggunaan Bahasa Indonesia yang baku.

Wajib kembalikan HANYA JSON object murni tanpa markdown dengan format persis:
{
  "suggested_score": 85,
  "rubric_breakdown": {
    "substance": 34,
    "analysis": 26,
    "structure": 25
  },
  "feedback_note": "Apresiasi aspek jawaban yang sudah tepat, evaluasi titik celah, serta saran perbaikan konseptual secara profesional."
}`, req.QuestionText, refText, req.UserAnswerText)
}

func (s *AIAgentService) gradeEssayWithGemini(ctx context.Context, req models.AIEssayGradeRequest) (*models.AIEssayGradeResponse, error) {
	keys := s.cfg.GeminiAPIKeys
	totalKeys := len(keys)
	if totalKeys == 0 {
		return nil, fmt.Errorf("no gemini api keys configured")
	}

	prompt := s.buildEssayPrompt(req)
	model := s.cfg.GeminiModel
	if model == "" {
		model = "gemini-1.5-flash"
	}

	startIndex := int(atomic.AddUint64(&s.geminiKeyIdx, 1) % uint64(totalKeys))

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
				"temperature":        0.3,
				"max_output_tokens":  4096,
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
			lastErr = err
			continue
		}

		respBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("gemini key %d status %d: %s", keyIndex+1, resp.StatusCode, string(respBytes))
			continue
		}

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
			lastErr = err
			continue
		}

		if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
			lastErr = fmt.Errorf("empty gemini candidates")
			continue
		}

		return s.parseEssayGradeJSON(geminiResp.Candidates[0].Content.Parts[0].Text)
	}

	return nil, fmt.Errorf("all gemini keys failed: %w", lastErr)
}

func (s *AIAgentService) gradeEssayWithGroq(ctx context.Context, req models.AIEssayGradeRequest) (*models.AIEssayGradeResponse, error) {
	keys := s.cfg.GroqAPIKeys
	totalKeys := len(keys)
	if totalKeys == 0 {
		return nil, fmt.Errorf("no groq api keys configured")
	}

	prompt := s.buildEssayPrompt(req)
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
					"content": "You are a senior academic assessor grading student essay responses based on rigorous evaluation rubrics. Return pure JSON object.",
				},
				{
					"role":    "user",
					"content": prompt,
				},
			},
			"temperature": 0.3,
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
			lastErr = err
			continue
		}

		respBytes, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("groq key %d status %d: %s", keyIndex+1, resp.StatusCode, string(respBytes))
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
			lastErr = err
			continue
		}

		if len(groqResp.Choices) == 0 {
			lastErr = fmt.Errorf("empty groq choices")
			continue
		}

		return s.parseEssayGradeJSON(groqResp.Choices[0].Message.Content)
	}

	return nil, fmt.Errorf("all groq keys failed: %w", lastErr)
}

func (s *AIAgentService) parseEssayGradeJSON(raw string) (*models.AIEssayGradeResponse, error) {
	cleanText := strings.TrimSpace(raw)
	cleanText = strings.TrimPrefix(cleanText, "```json")
	cleanText = strings.TrimPrefix(cleanText, "```")
	cleanText = strings.TrimSuffix(cleanText, "```")
	cleanText = strings.TrimSpace(cleanText)

	var res models.AIEssayGradeResponse
	if err := json.Unmarshal([]byte(cleanText), &res); err != nil {
		return nil, fmt.Errorf("failed to parse AI essay evaluation JSON: %w", err)
	}

	if res.SuggestedScore < 0 {
		res.SuggestedScore = 0
	}
	if res.SuggestedScore > 100 {
		res.SuggestedScore = 100
	}
	if strings.TrimSpace(res.FeedbackNote) == "" {
		res.FeedbackNote = fmt.Sprintf("Penilaian selesai dengan skor %d/100 berdasarkan evaluasi rubrik substansi dan logika argumentasi.", res.SuggestedScore)
	}
	if res.RubricBreakdown == nil {
		sub := res.SuggestedScore * 40 / 100
		ana := res.SuggestedScore * 30 / 100
		str := res.SuggestedScore - (sub + ana)
		res.RubricBreakdown = map[string]int{
			"substance": sub,
			"analysis":  ana,
			"structure": str,
		}
	}

	return &res, nil
}

func (s *AIAgentService) gradeEssayDeterministic(req models.AIEssayGradeRequest) *models.AIEssayGradeResponse {
	text := strings.TrimSpace(req.UserAnswerText)
	words := strings.Fields(text)
	wordCount := len(words)

	score := 50
	feedback := ""

	if wordCount < 10 {
		score = 35
		feedback = "Jawaban terlalu singkat dan belum memaparkan argumentasi maupun konsep pokok yang dipersyaratkan soal. Perlu penjelasan lebih mendalam."
	} else if wordCount < 30 {
		score = 65
		feedback = "Jawaban telah menyentuh inti bahasan, namun pembahasannya masih bersifat umum dan membutuhkan contoh konkret atau rujukan data."
	} else if wordCount < 60 {
		score = 82
		feedback = "Jawaban terstruktur dengan baik, argumentasi runut, dan mencakup sebagian besar indikator konseptual yang relevan."
	} else {
		score = 92
		feedback = "Analisis sangat tajam dan komprehensif. Menunjukkan pemahaman mendalam terhadap materi, argumentasi berbasis bukti, dan alur berpikir yang terstruktur rapi."
	}

	sub := score * 40 / 100
	ana := score * 30 / 100
	str := score - (sub + ana)

	return &models.AIEssayGradeResponse{
		SuggestedScore: score,
		FeedbackNote:   feedback,
		RubricBreakdown: map[string]int{
			"substance": sub,
			"analysis":  ana,
			"structure": str,
		},
		Provider: "Local Heuristic Rubric Engine",
	}
}
