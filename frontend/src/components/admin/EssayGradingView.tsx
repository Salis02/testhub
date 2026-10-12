import React, { useState } from 'react'
import { EssaySubmission } from '@/types'
import { CheckCircle2, FileText, Send } from 'lucide-react'

interface EssayGradingViewProps {
  submissions: EssaySubmission[]
  onGrade: (essayId: string, score: number, note: string) => Promise<void>
}

export const EssayGradingView: React.FC<EssayGradingViewProps> = ({
  submissions,
  onGrade,
}) => {
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(
    submissions.length > 0 ? submissions[0].id : null
  )
  const [score, setScore] = useState<number>(85)
  const [note, setNote] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedEssay = submissions.find((s) => s.id === selectedEssayId)

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEssay) return

    try {
      setIsSubmitting(true)
      await onGrade(selectedEssay.id, score, note)
      alert('Nilai dan catatan evaluasi berhasil disimpan ke rekam jejak peserta.')
      setNote('')
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submissions.length === 0) {
    return (
      <div className="p-12 text-center bg-surface border border-borderline rounded-lg text-ink-muted text-sm space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
        <p className="font-medium text-ink">Semua Lembar Esai Selesai Dikoreksi</p>
        <p className="text-xs">Tidak ada antrean jawaban esai yang membutuhkan penilaian saat ini.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Submissions List (Left Col) */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-muted font-mono">
          Antrean Pengumpulan Esai ({submissions.length})
        </h4>

        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {submissions.map((essay) => {
            const isSelected = essay.id === selectedEssayId
            const isGraded = essay.score !== undefined

            return (
              <div
                key={essay.id}
                onClick={() => {
                  setSelectedEssayId(essay.id)
                  if (essay.score !== undefined) setScore(essay.score)
                  if (essay.admin_review_note) setNote(essay.admin_review_note)
                }}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-accent bg-accent/10 shadow-xs'
                    : 'border-borderline bg-surface hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted mb-1">
                  <span>{new Date(essay.submitted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  {isGraded ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Dinilai: {essay.score}/100
                    </span>
                  ) : (
                    <span className="text-amber-500 font-semibold">Pending Review</span>
                  )}
                </div>
                <h5 className="text-xs font-semibold text-ink line-clamp-1">
                  {essay.test_title}
                </h5>
                <p className="text-[11px] text-ink-muted line-clamp-2 mt-1">
                  {essay.user_answer_text}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Grading Workbench (Right Col) */}
      <div className="md:col-span-2">
        {selectedEssay ? (
          <div className="p-6 rounded-lg bg-surface border border-borderline shadow-sm space-y-6">
            <div className="border-b border-borderline pb-4">
              <span className="text-xs font-mono text-ink-muted uppercase block">
                {selectedEssay.test_title} • Sesi: {selectedEssay.session_id.substring(0, 14)}...
              </span>
              <h4 className="text-sm sm:text-base font-semibold text-ink mt-1">
                Pertanyaan: {selectedEssay.question_text}
              </h4>
            </div>

            {/* Candidate Answer Box */}
            <div className="p-4 rounded-md bg-canvas border border-borderline space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-mono text-ink-muted">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>Jawaban Asli Peserta:</span>
              </div>
              <p className="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-wrap select-text">
                {selectedEssay.user_answer_text}
              </p>
            </div>

            {/* Grading Form (US-103) */}
            <form onSubmit={handleGradeSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                    Skor Nilai (Skala 0 - 100) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                    Template Rubrik Cepat:
                  </label>
                  <div className="flex space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setScore(95)
                        setNote('Analisis sangat tajam, komprehensif, dan memenuhi seluruh kriteria objektivitas regulasi.')
                      }}
                      className="px-2.5 py-1 text-[11px] rounded border border-borderline bg-canvas hover:bg-surface-hover text-ink"
                    >
                      Sempurna (95)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScore(75)
                        setNote('Argumen sudah baik namun perlu penguatan pada langkah mitigasi teknis dan kepatuhan.')
                      }}
                      className="px-2.5 py-1 text-[11px] rounded border border-borderline bg-canvas hover:bg-surface-hover text-ink"
                    >
                      Cukup (75)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Catatan Evaluasi & Umpan Balik Instruktur (Feedback Note):
                </label>
                <textarea
                  rows={4}
                  required
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Berikan koreksi substantif, apresiasi aspek kritis, dan rekomendasi pengayaan materi..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center space-x-2 px-5 py-2 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Kirim Nilai & Feedback'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-8 text-center text-ink-muted text-xs bg-surface border border-borderline rounded-lg">
            Pilih lembar esai dari kolom kiri untuk memulai penilaian.
          </div>
        )}
      </div>
    </div>
  )
}
