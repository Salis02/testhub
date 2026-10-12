package services

import (
	"fmt"
	"time"

	"testhub/internal/models"
)

type AIAgentService struct{}

func NewAIAgentService() *AIAgentService {
	return &AIAgentService{}
}

// GenerateQuestions generates questions complying with AI_AGENT_AND_SECURITY.md constraints
func (s *AIAgentService) GenerateQuestions(req models.AIGenerateRequest) ([]models.TestQuestion, error) {
	if req.Count <= 0 {
		req.Count = 1
	}
	if req.Count > 10 {
		req.Count = 10
	}

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

	trueVal := true
	falseVal := false
	var result []models.TestQuestion

	pts := 5
	if req.Difficulty == "hard" {
		pts = 10
	} else if req.Difficulty == "easy" {
		pts = 3
	}

	for i := 0; i < req.Count; i++ {
		topic := topics[i%len(topics)]
		qID := fmt.Sprintf("ai-gen-%d-%d", time.Now().UnixNano(), i+1)

		q := models.TestQuestion{
			ID:              qID,
			TestID:          "",
			QuestionNumber:  i + 1,
			QuestionText:    fmt.Sprintf("[AI Asesmen: %s] Berdasarkan prinsip baku terkait %s, manakah kesimpulan evaluatif yang paling tepat dalam konteks asesmen tingkat %s?", req.Subject, topic, req.Difficulty),
			QuestionType:    "multiple_choice",
			DifficultyLevel: req.Difficulty,
			Points:          pts,
			Explanation:     fmt.Sprintf("Analisis AI Asesmen: Opsi A menyajikan sintesis komprehensif berdasarkan prinsip %s dan kepatuhan standar profesional.", topic),
			Options: []models.QuestionOption{
				{
					ID:           fmt.Sprintf("opt-%s-a", qID),
					QuestionID:   qID,
					OptionLetter: "A",
					OptionText:   fmt.Sprintf("Penerapan sistematis sesuai regulasi resmi %s dengan audit kepatuhan berkala dan transparansi.", topic),
					IsCorrect:    &trueVal,
				},
				{
					ID:           fmt.Sprintf("opt-%s-b", qID),
					OptionLetter: "B",
					OptionText:   fmt.Sprintf("Penetapan kebijakan sepihak tanpa mempertimbangkan kapabilitas internal organisasi dan analisis dampak risiko.", topic),
					IsCorrect:    &falseVal,
				},
				{
					ID:           fmt.Sprintf("opt-%s-c", qID),
					OptionLetter: "C",
					OptionText:   fmt.Sprintf("Pendelegasian seluruh proses tanpa mekanisme pengawasan independen dan indikator kinerja terukur.", topic),
					IsCorrect:    &falseVal,
				},
				{
					ID:           fmt.Sprintf("opt-%s-d", qID),
					OptionLetter: "D",
					OptionText:   fmt.Sprintf("Penghapusan prosedur audit mutu demi percepatan tenggat waktu administratif jangka pendek.", topic),
					IsCorrect:    &falseVal,
				},
				{
					ID:           fmt.Sprintf("opt-%s-e", qID),
					OptionLetter: "E",
					OptionText:   fmt.Sprintf("Pengabaian asas keterbukaan informasi dan penolakan evaluasi berkala oleh pemangku kepentingan.", topic),
					IsCorrect:    &falseVal,
				},
			},
		}

		// Validation check rule from AI_AGENT_AND_SECURITY.md section 2.1
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
