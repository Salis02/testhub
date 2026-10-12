package main

import (
	"log"
	"time"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"

	"testhub/internal/config"
	"testhub/internal/database"
	"testhub/internal/models"
)

func main() {
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")

	cfg := config.LoadConfig()
	db, err := database.New(cfg)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.Close()

	log.Println("[Seed] Seeding default admin user and comprehensive test catalog...")

	now := time.Now()

	// 1. Seed Admin User
	adminPass, _ := bcrypt.GenerateFromPassword([]byte("AdminPassword123!"), bcrypt.DefaultCost)
	adminUser := models.User{
		ID:               "usr-admin-01",
		Email:            "admin@testhub.com",
		PasswordHash:     string(adminPass),
		FullName:         "Administrator TestHub",
		Role:             "admin",
		SubscriptionTier: "pro",
		IsActive:         true,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	_, _ = db.NamedExec(`
		INSERT INTO users (id, email, password_hash, full_name, role, subscription_tier, is_active, created_at, updated_at)
		VALUES (:id, :email, :password_hash, :full_name, :role, :subscription_tier, :is_active, :created_at, :updated_at)
		ON CONFLICT (email) DO NOTHING
	`, adminUser)

	// 2. Tests
	tests := []models.Test{
		{
			ID:                     "test-cpns-01",
			CreatorID:              &adminUser.ID,
			Title:                  "Simulasi Resmi SKD CPNS 2026: TWK & TIU Terpadu",
			Description:            "Tryout standar nasional seleksi CPNS meliputi Tes Wawasan Kebangsaan (Pancasila, UUD 1945, Integritas) dan Tes Intelegensia Umum (Silogisme, Analitis, Deret Angka).",
			Category:               "cpns",
			DurationMinutes:        25,
			PassingScorePercentage: 65,
			TotalQuestions:         6,
			Published:              true,
			CreatedAt:              now.Add(-48 * time.Hour),
			UpdatedAt:              now,
		},
		{
			ID:                     "test-sbmptn-02",
			CreatorID:              &adminUser.ID,
			Title:                  "UTBK-SNBT 2026: Tes Potensi Skolastik & Penalaran Matematika",
			Description:            "Latihan soal berstandar BPPP Kemendikbudristek untuk menguji kemampuan penalaran umum, pemahaman bacaan & menulis, serta literasi kuantitatif.",
			Category:               "sbmptn",
			DurationMinutes:        20,
			PassingScorePercentage: 60,
			TotalQuestions:         5,
			Published:              true,
			CreatedAt:              now.Add(-36 * time.Hour),
			UpdatedAt:              now,
		},
		{
			ID:                     "test-iq-03",
			CreatorID:              &adminUser.ID,
			Title:                  "Standard Raven Progressive Matrices & Logical IQ Assessment",
			Description:            "Tes IQ non-verbal berbasis logika matriks pola visual, relasi spasial, dan penalaran deduktif untuk mengukur kecerdasan umum (Fluid Intelligence / g-factor).",
			Category:               "iq",
			DurationMinutes:        15,
			PassingScorePercentage: 70,
			TotalQuestions:         5,
			Published:              true,
			CreatedAt:              now.Add(-24 * time.Hour),
			UpdatedAt:              now,
		},
		{
			ID:                     "test-custom-04",
			CreatorID:              &adminUser.ID,
			Title:                  "Asesmen Rekrutmen Bersama BUMN: Core Values AKHLAK & Leadership",
			Description:            "Uji pemahaman komprehensif implementasi nilai Amanah, Kompeten, Harmonis, Loyal, Adaptif, dan Kolaboratif dalam situasi kerja nyata korporasi BUMN.",
			Category:               "custom",
			DurationMinutes:        15,
			PassingScorePercentage: 75,
			TotalQuestions:         4,
			Published:              true,
			CreatedAt:              now.Add(-12 * time.Hour),
			UpdatedAt:              now,
		},
	}

	for _, t := range tests {
		_, _ = db.NamedExec(`
			INSERT INTO tests (id, creator_id, title, description, category, duration_minutes, passing_score_percentage, total_questions, shuffle_questions, shuffle_answers, published, is_deleted, created_at, updated_at)
			VALUES (:id, :creator_id, :title, :description, :category, :duration_minutes, :passing_score_percentage, :total_questions, false, false, :published, false, :created_at, :updated_at)
			ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, published = EXCLUDED.published
		`, t)
	}

	// 3. Questions and Options
	trueVal := true
	falseVal := false

	type qSeed struct {
		q    models.TestQuestion
		opts []models.QuestionOption
	}

	qList := []qSeed{
		// CPNS Questions
		{
			q: models.TestQuestion{
				ID:              "q-cpns-1",
				TestID:          "test-cpns-01",
				QuestionNumber:  1,
				QuestionText:    "Dalam sidang BPUPKI pertama tanggal 1 Juni 1945, Ir. Soekarno mengusulkan lima dasar negara Indonesia merdeka. Salah satu prinsip yang ditekankan adalah 'Kesejahteraan Sosial'. Dalam kerangka pembangunan nasional kontemporer, manifestasi utama dari sila kelima Pancasila yang berkeadilan sosial adalah...",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "medium",
				Points:          5,
				Explanation:     "Sila kelima Pancasila menekankan keadilan distributif negara dalam menjamin perlindungan sosial, pemerataan kesempatan ekonomi, dan aksesibilitas sumber daya publik tanpa diskriminasi.",
			},
			opts: []models.QuestionOption{
				{ID: "opt-1-a", OptionLetter: "A", OptionText: "Pemberian privilese fiskal kepada konglomerat demi pertumbuhan industri manufaktur padat modal.", IsCorrect: &falseVal},
				{ID: "opt-1-b", OptionLetter: "B", OptionText: "Jaminan perlindungan sosial universal, pemerataan akses pendidikan-kesehatan, dan pemberdayaan ekonomi inklusif.", IsCorrect: &trueVal},
				{ID: "opt-1-c", OptionLetter: "C", OptionText: "Penyerahan sepenuhnya mekanisme distribusi komoditas pangan pokok kepada hukum pasar bebas murni.", IsCorrect: &falseVal},
				{ID: "opt-1-d", OptionLetter: "D", OptionText: "Sentralisasi seluruh aset produktif daerah langsung di bawah kendali kementerian pusat.", IsCorrect: &falseVal},
				{ID: "opt-1-e", OptionLetter: "E", OptionText: "Penghapusan pungutan pajak progresif untuk merangsang akumulasi modal swasta.", IsCorrect: &falseVal},
			},
		},
		{
			q: models.TestQuestion{
				ID:              "q-cpns-2",
				TestID:          "test-cpns-01",
				QuestionNumber:  2,
				QuestionText:    "Semua aparatur sipil negara yang profesional senantiasa menjunjung tinggi integritas publik. Sebagian pejabat di lingkungan kantor regional X terbukti menerima gratifikasi proyek pengadaan barang. Kesimpulan silogisme yang paling valid adalah...",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "easy",
				Points:          5,
				Explanation:     "Karena aparatur yang profesional selalu berintegritas dan menolak gratifikasi, maka pejabat yang menerima gratifikasi terbukti bukan aparatur sipil negara yang profesional.",
			},
			opts: []models.QuestionOption{
				{ID: "opt-2-a", OptionLetter: "A", OptionText: "Sebagian aparatur sipil negara di kantor regional X bukan pejabat publik yang profesional.", IsCorrect: &trueVal},
				{ID: "opt-2-b", OptionLetter: "B", OptionText: "Semua aparatur sipil negara di kantor regional X terbukti tidak memiliki integritas.", IsCorrect: &falseVal},
				{ID: "opt-2-c", OptionLetter: "C", OptionText: "Sebagian pejabat yang profesional diperbolehkan menerima gratifikasi tertentu.", IsCorrect: &falseVal},
				{ID: "opt-2-d", OptionLetter: "D", OptionText: "Hanya aparatur sipil negara di luar kantor regional X yang memiliki profesionalisme tinggi.", IsCorrect: &falseVal},
				{ID: "opt-2-e", OptionLetter: "E", OptionText: "Tidak ada korelasi antara integritas dengan profesionalisme aparatur sipil negara.", IsCorrect: &falseVal},
			},
		},
		{
			q: models.TestQuestion{
				ID:              "q-cpns-3",
				TestID:          "test-cpns-01",
				QuestionNumber:  3,
				QuestionText:    "Perhatikan deret bilangan berikut: 3, 7, 15, 31, 63, ..., ... Nilai dua suku berikutnya berturut-turut adalah...",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "easy",
				Points:          5,
				Explanation:     "Pola deret adalah Un = 2 * Un-1 + 1 (selisih bertambah 2x lipat: +4, +8, +16, +32, +64, +128). Maka 63*2+1 = 127 dan 127*2+1 = 255.",
			},
			opts: []models.QuestionOption{
				{ID: "opt-3-a", OptionLetter: "A", OptionText: "126 dan 252", IsCorrect: &falseVal},
				{ID: "opt-3-b", OptionLetter: "B", OptionText: "127 dan 255", IsCorrect: &trueVal},
				{ID: "opt-3-c", OptionLetter: "C", OptionText: "125 dan 249", IsCorrect: &falseVal},
				{ID: "opt-3-d", OptionLetter: "D", OptionText: "128 dan 256", IsCorrect: &falseVal},
				{ID: "opt-3-e", OptionLetter: "E", OptionText: "131 dan 263", IsCorrect: &falseVal},
			},
		},
		{
			q: models.TestQuestion{
				ID:              "q-cpns-4",
				TestID:          "test-cpns-01",
				QuestionNumber:  4,
				QuestionText:    "Sebagai Pejabat Pembuat Komitmen (PPK), Anda menerima laporan bahwa rekan kerja satu almamater menawarkan sponsor kegiatan pribadi jika tender proyek pengadaan disetujui. Bagaimana langkah etis dan prosedural yang harus Anda ambil?",
				QuestionType:    "essay",
				DifficultyLevel: "hard",
				Points:          10,
				Explanation:     "Kunci jawaban yang diharapkan meliputi: (1) Menjunjung asas netralitas dan transparansi, (2) Melaporkan potensi benturan kepentingan kepada Unit Pengendali Gratifikasi (UPG) atau Inspektorat/APIP, (3) Memastikan audit kepatuhan spesifikasi teknis berjalan objektif tanpa intervensi personal.",
			},
			opts: []models.QuestionOption{},
		},
		// SBMPTN Questions
		{
			q: models.TestQuestion{
				ID:              "q-sbm-1",
				TestID:          "test-sbmptn-02",
				QuestionNumber:  1,
				QuestionText:    "Sebuah tangki air berbentuk silinder tegak sedang dikosongkan. Laju penurunan volume air sebanding dengan akar tinggi permukaan air saat itu. Jika pada t=0 tinggi air 9 meter dan pada t=2 jam tinggi air menjadi 4 meter, kapan tangki tersebut kosong sepenuhnya?",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "hard",
				Points:          5,
				Explanation:     "Persamaan diferensial: dh/dt = -k*sqrt(h). Solusinya: 2*sqrt(h) = -k*t + C. Dengan h(0)=9 didapat C=6. Pada t=2, h=4 didapat 2*2 = -2k + 6 -> k=1. Tangki kosong saat h=0 -> -t + 6 = 0 -> t = 6 jam.",
			},
			opts: []models.QuestionOption{
				{ID: "opt-sbm-1-a", OptionLetter: "A", OptionText: "4 jam", IsCorrect: &falseVal},
				{ID: "opt-sbm-1-b", OptionLetter: "B", OptionText: "5 jam", IsCorrect: &falseVal},
				{ID: "opt-sbm-1-c", OptionLetter: "C", OptionText: "6 jam", IsCorrect: &trueVal},
				{ID: "opt-sbm-1-d", OptionLetter: "D", OptionText: "7,5 jam", IsCorrect: &falseVal},
				{ID: "opt-sbm-1-e", OptionLetter: "E", OptionText: "8 jam", IsCorrect: &falseVal},
			},
		},
		// IQ Question
		{
			q: models.TestQuestion{
				ID:              "q-iq-1",
				TestID:          "test-iq-03",
				QuestionNumber:  1,
				QuestionText:    "Pada matriks logika visual berukuran 3x3, baris pertama memutar figur 45 derajat searah jarum jam dan menambah 1 titik. Baris kedua memutar 90 derajat berlawanan jarum jam dan menambah 2 titik. Baris ketiga menerapkan refleksi horizontal ganda. Pola apakah yang melengkapi sel kanan bawah?",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "medium",
				Points:          5,
				Explanation:     "Refleksi ganda horizontal mempertahankan orientasi vertikal asli dengan invasi sumbu simetri Y.",
			},
			opts: []models.QuestionOption{
				{ID: "opt-iq-1-a", OptionLetter: "A", OptionText: "Bujursangkar simetris dengan arsiran diagonal kiri dan 3 titik pusat.", IsCorrect: &trueVal},
				{ID: "opt-iq-1-b", OptionLetter: "B", OptionText: "Segitiga terbalik tanpa arsiran dan 1 titik sisi kanan.", IsCorrect: &falseVal},
				{ID: "opt-iq-1-c", OptionLetter: "C", OptionText: "Lingkaran konsentris tanpa rotasi simetri.", IsCorrect: &falseVal},
				{ID: "opt-iq-1-d", OptionLetter: "D", OptionText: "Belah ketupat berputar 180 derajat berlawanan.", IsCorrect: &falseVal},
			},
		},
		// Custom BUMN Question
		{
			q: models.TestQuestion{
				ID:              "q-bumn-1",
				TestID:          "test-custom-04",
				QuestionNumber:  1,
				QuestionText:    "Dalam konteks Core Values AKHLAK BUMN, nilai 'Harmonis' diterjemahkan sebagai perilaku saling peduli dan menghargai perbedaan. Manakah tindakan konkret yang mencerminkan nilai tersebut di lingkungan kerja?",
				QuestionType:    "multiple_choice",
				DifficultyLevel: "medium",
				Points:          5,
				Explanation:     "Perilaku kunci nilai Harmonis meliputi menghargai setiap orang apapun latar belakangnya, suka menolong orang lain, dan membangun lingkungan kerja yang kondusif.",
			},
			opts: []models.QuestionOption{
				{ID: "opt-bumn-1-a", OptionLetter: "A", OptionText: "Membangun lingkungan kerja yang kondusif dan menghargai keberagaman pendapat tim.", IsCorrect: &trueVal},
				{ID: "opt-bumn-1-b", OptionLetter: "B", OptionText: "Menghindari koordinasi lintas divisi untuk meminimalisasi potensi konflik pendapat.", IsCorrect: &falseVal},
				{ID: "opt-bumn-1-c", OptionLetter: "C", OptionText: "Memberikan penugasan kerja eksklusif hanya kepada kelompok rekan yang sealiran.", IsCorrect: &falseVal},
				{ID: "opt-bumn-1-d", OptionLetter: "D", OptionText: "Memaksakan cara kerja lama tanpa memberi ruang inovasi bagi anggota tim baru.", IsCorrect: &falseVal},
			},
		},
	}

	for _, item := range qList {
		_, _ = db.Exec(`
			INSERT INTO test_questions (id, test_id, question_number, question_text, question_type, difficulty_level, explanation, points, is_deleted, created_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)
			ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, explanation = EXCLUDED.explanation
		`, item.q.ID, item.q.TestID, item.q.QuestionNumber, item.q.QuestionText, item.q.QuestionType, item.q.DifficultyLevel, item.q.Explanation, item.q.Points, now)

		for _, opt := range item.opts {
			_, _ = db.Exec(`
				INSERT INTO question_options (id, question_id, option_letter, option_text, is_correct, created_at)
				VALUES ($1, $2, $3, $4, $5, $6)
				ON CONFLICT (id) DO UPDATE SET option_text = EXCLUDED.option_text, is_correct = EXCLUDED.is_correct
			`, opt.ID, item.q.ID, opt.OptionLetter, opt.OptionText, opt.IsCorrect, now)
		}
	}

	// 4. Seed sample essay submissions for admin evaluation demo
	sampleSessionID := "sess-demo-sample-01"
	_, _ = db.Exec(`
		INSERT INTO test_sessions (id, test_id, ip_address, user_agent, started_at, expires_at, is_active, created_at)
		VALUES ($1, 'test-cpns-01', '127.0.0.1', 'Mozilla/5.0 Demo Browser', $2, $3, false, $2)
		ON CONFLICT (id) DO NOTHING
	`, sampleSessionID, now.Add(-2*time.Hour), now.Add(22*time.Hour))

	_, _ = db.Exec(`
		INSERT INTO test_submissions (id, session_id, question_id, user_answer_text, score, is_flagged, submitted_at, created_at)
		VALUES ('sub-essay-demo-1', $1, 'q-cpns-4', 
		'Saya akan menolak sponsorship secara tegas dan sopan, segera membuat nota laporan integritas kepada Unit Pengendali Gratifikasi (UPG) Kementerian, serta meminta pergantian panitia evaluasi teknis demi menjaga netralitas audit tender.',
		NULL, false, $2, $2)
		ON CONFLICT (id) DO NOTHING
	`, sampleSessionID, now.Add(-1*time.Hour))

	log.Println("[Seed] Database seed completed successfully!")
}
