import React, { useState } from 'react'
import { Test, Question, TestCategory, QuestionType } from '@/types'
import { X, Plus, Trash2, Sparkles } from 'lucide-react'

interface TestCreatorModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (testData: Omit<Test, 'id' | 'created_at' | 'updated_at'>, questions: Question[]) => Promise<void>
  onOpenAIAssistant: () => void
}

export const TestCreatorModal: React.FC<TestCreatorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onOpenAIAssistant,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TestCategory>('cpns')
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [passingScore, setPassingScore] = useState(65)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-new-1',
      test_id: '',
      question_number: 1,
      question_text: '',
      question_type: 'multiple_choice',
      difficulty_level: 'medium',
      points: 5,
      explanation: '',
      options: [
        { id: 'opt-new-1', option_letter: 'A', option_text: '', is_correct: true },
        { id: 'opt-new-2', option_letter: 'B', option_text: '', is_correct: false },
        { id: 'opt-new-3', option_letter: 'C', option_text: '', is_correct: false },
        { id: 'opt-new-4', option_letter: 'D', option_text: '', is_correct: false },
      ],
    },
  ])

  if (!isOpen) return null

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1
    setQuestions([
      ...questions,
      {
        id: `q-new-${Date.now()}`,
        test_id: '',
        question_number: nextNum,
        question_text: '',
        question_type: 'multiple_choice',
        difficulty_level: 'medium',
        points: 5,
        explanation: '',
        options: [
          { id: `opt-${Date.now()}-1`, option_letter: 'A', option_text: '', is_correct: true },
          { id: `opt-${Date.now()}-2`, option_letter: 'B', option_text: '', is_correct: false },
          { id: `opt-${Date.now()}-3`, option_letter: 'C', option_text: '', is_correct: false },
          { id: `opt-${Date.now()}-4`, option_letter: 'D', option_text: '', is_correct: false },
        ],
      },
    ])
  }

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return
    const filtered = questions.filter((_, i) => i !== idx)
    setQuestions(filtered.map((q, i) => ({ ...q, question_number: i + 1 })))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('Judul modul ujian tidak boleh kosong.')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit(
        {
          title: title.trim(),
          description: description.trim(),
          category,
          duration_minutes: Number(durationMinutes),
          passing_score_percentage: Number(passingScore),
          total_questions: questions.length,
          published: true,
        },
        questions
      )
      onClose()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 dark:bg-black/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">Formulir Pembuatan Modul Ujian</h3>
            <p className="text-xs text-ink-muted">
              Definisikan parameter ujian dan susun butir-butir pertanyaan secara terstruktur.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-hover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Judul Ujian / Modul *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Tryout Nasional SKD CPNS 2026 - Paket A"
                className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Deskripsi & Petunjuk Pengerjaan
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat mengenai materi uji dan peraturan..."
                className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Kategori Ujian
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TestCategory)}
                className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              >
                <option value="cpns">CPNS / Sekolah Kedinasan</option>
                <option value="sbmptn">UTBK-SNBT Kemendikbud</option>
                <option value="iq">IQ Matrix Assessment</option>
                <option value="custom">BUMN AKHLAK / Custom</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Durasi (Menit)
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Passing Grade (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={passingScore}
                  onChange={(e) => setPassingScore(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                />
              </div>
            </div>
          </div>

          {/* Questions Section Header with AI Generator Button */}
          <div className="border-t border-borderline pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-ink">
                Daftar Butir Soal ({questions.length})
              </h4>
              <p className="text-xs text-ink-muted">
                Tambahkan pilihan ganda atau esai lengkap dengan kunci & pembahasan.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onOpenAIAssistant}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-accent/40 bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Generator Soal</span>
              </button>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-borderline bg-canvas text-ink text-xs font-medium hover:bg-surface-hover transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Soal</span>
              </button>
            </div>
          </div>

          {/* Questions Cards */}
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                className="p-5 rounded-lg border border-borderline bg-canvas space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface border border-borderline text-ink">
                    SOAL #{qIndex + 1}
                  </span>
                  <div className="flex items-center space-x-2">
                    <select
                      value={q.question_type}
                      onChange={(e) => {
                        const updated = [...questions]
                        updated[qIndex].question_type = e.target.value as QuestionType
                        setQuestions(updated)
                      }}
                      className="px-2 py-1 text-xs rounded border border-borderline bg-surface text-ink font-mono"
                    >
                      <option value="multiple_choice">Pilihan Ganda</option>
                      <option value="essay">Esai</option>
                    </select>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIndex)}
                        className="p-1 text-ink-muted hover:text-red-500 rounded"
                        title="Hapus soal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <textarea
                    rows={3}
                    required
                    value={q.question_text}
                    onChange={(e) => {
                      const updated = [...questions]
                      updated[qIndex].question_text = e.target.value
                      setQuestions(updated)
                    }}
                    placeholder={`Tuliskan teks pertanyaan soal #${qIndex + 1}...`}
                    className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* Multiple Choice Options */}
                {q.question_type === 'multiple_choice' && (
                  <div className="space-y-2 pt-1">
                    <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                      Opsi Jawaban & Kunci (Klik radio untuk tandai benar):
                    </span>
                    {q.options.map((opt, optIndex) => (
                      <div key={opt.id} className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...questions]
                            updated[qIndex].options = updated[qIndex].options.map((o, idx) => ({
                              ...o,
                              is_correct: idx === optIndex,
                            }))
                            setQuestions(updated)
                          }}
                          className={`w-7 h-7 rounded font-mono text-xs flex items-center justify-center font-bold flex-shrink-0 transition-colors ${
                            opt.is_correct
                              ? 'bg-accent text-white shadow-xs'
                              : 'bg-surface border border-borderline text-ink-muted hover:text-ink'
                          }`}
                        >
                          {opt.option_letter}
                        </button>
                        <input
                          type="text"
                          required
                          value={opt.option_text}
                          onChange={(e) => {
                            const updated = [...questions]
                            updated[qIndex].options[optIndex].option_text = e.target.value
                            setQuestions(updated)
                          }}
                          placeholder={`Jawaban opsi ${opt.option_letter}...`}
                          className="flex-1 px-3 py-1.5 text-xs rounded border border-borderline bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                    Pembahasan / Kriteria Penilaian:
                  </label>
                  <input
                    type="text"
                    value={q.explanation}
                    onChange={(e) => {
                      const updated = [...questions]
                      updated[qIndex].explanation = e.target.value
                      setQuestions(updated)
                    }}
                    placeholder="Rasionalisasi kunci jawaban atau rubrik penilaian esai..."
                    className="w-full px-3 py-1.5 text-xs rounded border border-borderline bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-borderline">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-md border border-borderline bg-canvas text-ink hover:bg-surface-hover transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-md bg-accent text-white hover:opacity-95 shadow-xs transition-opacity"
            >
              {isSubmitting ? 'Menyimpan Ujian...' : 'Simpan & Publikasikan Ujian'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
