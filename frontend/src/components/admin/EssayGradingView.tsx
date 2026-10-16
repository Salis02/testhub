import React, { useState } from 'react'
import { EssaySubmission } from '@/types'
import { CheckCircle2, FileText, Send, Sparkles, Loader2, Award } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { adminApi } from '@/services/admin.api'

interface EssayGradingViewProps {
  submissions: EssaySubmission[]
  onGrade: (essayId: string, score: number, note: string) => Promise<void>
}

export const EssayGradingView: React.FC<EssayGradingViewProps> = ({
  submissions,
  onGrade,
}) => {
  const toast = useToast()
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(
    submissions.length > 0 ? submissions[0].id : null
  )
  const [score, setScore] = useState<number>(85)
  const [note, setNote] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAiGrading, setIsAiGrading] = useState(false)
  const [aiResult, setAiResult] = useState<{
    suggested_score: number
    feedback_note: string
    rubric_breakdown: Record<string, number>
    provider: string
  } | null>(null)

  const selectedEssay = submissions.find((s) => s.id === selectedEssayId)

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEssay) return

    try {
      setIsSubmitting(true)
      await onGrade(selectedEssay.id, score, note)
      toast.success(
        'Penilaian Berhasil Disimpan',
        `Skor ${score} dan catatan evaluasi telah dicatat ke rekam jejak peserta.`
      )
      setNote('')
      setAiResult(null)
    } catch (err) {
      toast.error('Gagal Menyimpan Penilaian', (err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAIGrade = async () => {
    if (!selectedEssay) return
    if (!selectedEssay.user_answer_text.trim()) {
      toast.warning('Jawaban Kosong', 'Peserta tidak memberikan jawaban esai untuk dinilai.')
      return
    }

    try {
      setIsAiGrading(true)
      const res = await adminApi.aiGradeEssay({
        essay_id: selectedEssay.id,
        question_text: selectedEssay.question_text,
        user_answer_text: selectedEssay.user_answer_text,
      })
      setScore(res.suggested_score)
      setNote(res.feedback_note)
      setAiResult(res)
      toast.success(
        'Rekomendasi AI Selesai',
        `Skor ${res.suggested_score} dialokasikan via ${res.provider}. Anda dapat mereview dan menyesuaikan nilai sebelum disimpan.`
      )
    } catch (err) {
      toast.error('Gagal Mengakses AI Grader', (err as Error).message)
    } finally {
      setIsAiGrading(false)
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
                  setAiResult(null)
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

            {/* AI Auto-Grader Toolbar & Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-surface border border-borderline shadow-2xs">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-semibold text-ink">AI Essay Auto-Grader</h5>
                  <p className="text-[11px] text-ink-muted">Evaluasi jawaban berdasarkan substansi, penalaran, dan tata bahasa.</p>
                </div>
              </div>

              <button
                type="button"
                disabled={isAiGrading || !selectedEssay.user_answer_text.trim()}
                onClick={handleAIGrade}
                className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-md bg-accent text-white text-xs font-semibold hover:bg-accent/90 shadow-xs transition-all disabled:opacity-50"
              >
                {isAiGrading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menganalisis Jawaban...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>✨ Nilai Otomatis dengan AI</span>
                  </>
                )}
              </button>
            </div>

            {/* AI Rubric Breakdown Card (Visible when generated) */}
            {aiResult && (
              <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center space-x-1.5 font-semibold text-accent">
                    <Award className="w-4 h-4" />
                    <span>Rekomendasi Rubrik AI ({aiResult.provider})</span>
                  </span>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                    Skor: {aiResult.suggested_score} / 100
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center font-mono text-xs">
                  <div className="p-2 rounded bg-surface border border-borderline">
                    <span className="block text-ink-muted text-[10px] uppercase font-sans">Substansi & Teori</span>
                    <span className="font-bold text-ink">{aiResult.rubric_breakdown?.substance ?? 0}</span>
                    <span className="text-[10px] text-ink-muted font-sans"> / 40</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-borderline">
                    <span className="block text-ink-muted text-[10px] uppercase font-sans">Analisis Kritis</span>
                    <span className="font-bold text-ink">{aiResult.rubric_breakdown?.analysis ?? 0}</span>
                    <span className="text-[10px] text-ink-muted font-sans"> / 30</span>
                  </div>
                  <div className="p-2 rounded bg-surface border border-borderline">
                    <span className="block text-ink-muted text-[10px] uppercase font-sans">Sistematika Argumen</span>
                    <span className="font-bold text-ink">{aiResult.rubric_breakdown?.structure ?? 0}</span>
                    <span className="text-[10px] text-ink-muted font-sans"> / 30</span>
                  </div>
                </div>

                <p className="text-[11px] text-ink-muted italic">
                  * Skor dan umpan balik telah diisikan ke form di bawah. Anda dapat mengedit atau menambahkan catatan sebelum menyimpan.
                </p>
              </div>
            )}

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
                    Template Rubrik Manual:
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
