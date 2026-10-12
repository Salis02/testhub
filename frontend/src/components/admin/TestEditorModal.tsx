import React, { useState, useEffect } from 'react'
import { Test, Question, TestCategory, QuestionType } from '@/types'
import { api } from '@/services/api'
import { MediaUploader } from '@/components/common/MediaUploader'
import { Skeleton } from '@/components/common/Skeleton'
import { X, Plus, Trash2, Sparkles, Save, Loader2, ArrowLeft } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

interface TestEditorModalProps {
  isOpen: boolean
  testId: string | null
  onClose: () => void
  onUpdated: () => void
  onOpenAIAssistant: () => void
  pendingAIQuestions?: Question[]
  onClearPendingAIQuestions?: () => void
}

export const TestEditorModal: React.FC<TestEditorModalProps> = ({
  isOpen,
  testId,
  onClose,
  onUpdated,
  onOpenAIAssistant,
  pendingAIQuestions = [],
  onClearPendingAIQuestions,
}) => {
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toast = useToast()

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TestCategory>('cpns')
  const [durationMinutes, setDurationMinutes] = useState(25)
  const [passingScore, setPassingScore] = useState(65)
  const [published, setPublished] = useState(true)
  const [questions, setQuestions] = useState<Question[]>([])

  // Load test data on open
  useEffect(() => {
    if (isOpen && testId) {
      loadTestDetails(testId)
    }
  }, [isOpen, testId])

  // Append pending AI questions if available
  useEffect(() => {
    if (isOpen && pendingAIQuestions && pendingAIQuestions.length > 0) {
      setQuestions((prev) => [
        ...prev,
        ...pendingAIQuestions.map((q, idx) => ({
          ...q,
          id: `q-append-${Date.now()}-${idx}`,
          question_number: prev.length + idx + 1,
        })),
      ])
      if (onClearPendingAIQuestions) {
        onClearPendingAIQuestions()
      }
      toast.success(
        'Soal AI Ditambahkan',
        `${pendingAIQuestions.length} butir soal hasil generasi AI disematkan ke editor.`
      )
    }
  }, [isOpen, pendingAIQuestions])

  const loadTestDetails = async (id: string) => {
    try {
      setLoading(true)
      const data = await api.getAdminTest(id)
      setTitle(data.test.title)
      setDescription(data.test.description || '')
      setCategory(data.test.category)
      setDurationMinutes(data.test.duration_minutes)
      setPassingScore(data.test.passing_score_percentage)
      setPublished(data.test.published)
      setQuestions(data.questions || [])
    } catch (err) {
      toast.error('Gagal Memuat Data Ujian', (err as Error).message)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1
    const newQ: Question = {
      id: `q-new-${Date.now()}`,
      test_id: testId || '',
      question_number: nextNum,
      question_text: '',
      question_type: 'multiple_choice',
      media_url: null,
      difficulty_level: 'medium',
      points: 5,
      explanation: '',
      options: [
        { id: `opt-${nextNum}-a`, option_letter: 'A', option_text: '', is_correct: true },
        { id: `opt-${nextNum}-b`, option_letter: 'B', option_text: '', is_correct: false },
        { id: `opt-${nextNum}-c`, option_letter: 'C', option_text: '', is_correct: false },
        { id: `opt-${nextNum}-d`, option_letter: 'D', option_text: '', is_correct: false },
      ],
    }
    setQuestions([...questions, newQ])
  }

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      toast.warning('Peringatan', 'Ujian minimal harus memiliki 1 butir soal.')
      return
    }
    const filtered = questions.filter((_, i) => i !== idx)
    setQuestions(filtered.map((q, i) => ({ ...q, question_number: i + 1 })))
    toast.info('Soal Dihapus', `Butir soal #${idx + 1} telah dihapus dari draf.`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testId) return

    if (!title.trim()) {
      toast.warning('Validasi Gagal', 'Judul modul ujian tidak boleh kosong.')
      return
    }

    if (questions.length === 0) {
      toast.warning('Validasi Gagal', 'Ujian minimal harus memiliki setidaknya 1 butir soal.')
      return
    }

    // Verify all multiple choice questions have at least 1 correct answer
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (q.question_type === 'multiple_choice') {
        const hasCorrect = q.options.some((o) => o.is_correct)
        if (!hasCorrect) {
          toast.warning(
            'Kunci Jawaban Belum Dipilih',
            `Soal #${i + 1} belum memiliki kunci jawaban yang ditandai benar.`
          )
          return
        }
      }
    }

    try {
      setIsSubmitting(true)
      await api.updateAdminTest(
        testId,
        {
          title: title.trim(),
          description: description.trim(),
          category,
          duration_minutes: Number(durationMinutes),
          passing_score_percentage: Number(passingScore),
          published,
        },
        questions
      )

      toast.success(
        'Modul & Soal Berhasil Diperbarui',
        `Perubahan pada "${title.trim()}" telah disimpan ke server.`
      )
      onUpdated()
      onClose()
    } catch (err) {
      toast.error('Gagal Memperbarui Modul', (err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 dark:bg-black/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-ink">
                Edit Modul Ujian & Bank Soal
              </h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                {testId}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Perbarui parameter ujian, lampirkan media gambar pada soal, serta sesuaikan opsi jawaban.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center space-x-2 text-ink-muted text-sm font-mono">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span>Memuat butir soal dan lampiran dari server...</span>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-20 w-full rounded" />
              <Skeleton className="h-40 w-full rounded" />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Metadata Fields */}
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
                  placeholder="Judul modul ujian..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Deskripsi & Petunjuk
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi materi uji dan ketentuan peserta..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Kategori
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
                    max={300}
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

            {/* Questions Header with Actions */}
            <div className="border-t border-borderline pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-ink flex items-center space-x-2">
                  <span>Daftar Butir Soal</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-surface border border-borderline">
                    {questions.length} Butir
                  </span>
                </h4>
                <p className="text-xs text-ink-muted">
                  Kelola redaksi pertanyaan, unggah gambar media, dan sesuaikan kunci jawaban.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onOpenAIAssistant}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-accent/40 bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate dengan AI</span>
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

            {/* Question Cards List */}
            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id || `q-${qIndex}`}
                  className="p-5 rounded-lg border border-borderline bg-canvas space-y-4 transition-all"
                >
                  {/* Top bar of question card */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface border border-borderline text-ink">
                        SOAL #{qIndex + 1}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <label className="text-[11px] text-ink-muted font-medium">Bobot:</label>
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={q.points || 5}
                          onChange={(e) => {
                            const updated = [...questions]
                            updated[qIndex].points = Number(e.target.value)
                            setQuestions(updated)
                          }}
                          className="w-14 px-1.5 py-0.5 text-xs rounded border border-borderline bg-surface text-ink font-mono text-center"
                        />
                        <span className="text-[11px] text-ink-muted">Poin</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={q.difficulty_level || 'medium'}
                        onChange={(e) => {
                          const updated = [...questions]
                          updated[qIndex].difficulty_level = e.target.value as any
                          setQuestions(updated)
                        }}
                        className="px-2 py-1 text-xs rounded border border-borderline bg-surface text-ink font-mono"
                      >
                        <option value="easy">Tingkat: Mudah</option>
                        <option value="medium">Tingkat: Sedang</option>
                        <option value="hard">Tingkat: Sulit</option>
                      </select>

                      <select
                        value={q.question_type || 'multiple_choice'}
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
                          title="Hapus butir soal ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                      Teks Pertanyaan Soal:
                    </label>
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

                  {/* Media Image Uploader Component */}
                  <MediaUploader
                    mediaUrl={q.media_url}
                    onChange={(url) => {
                      const updated = [...questions]
                      updated[qIndex].media_url = url
                      setQuestions(updated)
                    }}
                    label="Lampirkan Gambar/Diagram Soal"
                  />

                  {/* Multiple Choice Options */}
                  {q.question_type === 'multiple_choice' && (
                    <div className="space-y-2 pt-2">
                      <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                        Opsi Pilihan Jawaban (Klik lingkaran huruf untuk menentukan kunci jawaban yang benar):
                      </span>
                      {(q.options || []).map((opt, optIndex) => (
                        <div key={opt.id || `opt-${optIndex}`} className="flex items-center space-x-2">
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
                            title={opt.is_correct ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan kunci'}
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
                            placeholder={`Pernyataan opsi ${opt.option_letter}...`}
                            className="flex-1 px-3 py-1.5 text-xs rounded border border-borderline bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explanation Field */}
                  <div>
                    <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                      Pembahasan & Rasionalisasi Ilmiah:
                    </label>
                    <textarea
                      rows={2}
                      value={q.explanation || ''}
                      onChange={(e) => {
                        const updated = [...questions]
                        updated[qIndex].explanation = e.target.value
                        setQuestions(updated)
                      }}
                      placeholder="Uraikan dasar teori, pembahasan kunci jawaban, atau rubrik penilaian..."
                      className="w-full px-3 py-1.5 text-xs rounded border border-borderline bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Submit / Cancel Buttons */}
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
                className="inline-flex items-center space-x-2 px-5 py-2 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Perubahan Soal</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
