import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { useTestSessionStore } from '@/stores/useTestSessionStore'

interface FinishConfirmModalProps {
  isOpen: boolean
  totalQuestions: number
  answeredCount: number
  flaggedCount: number
  onConfirm: () => void
  onCancel: () => void
  isSubmitting: boolean
}

export const FinishConfirmModal: React.FC<FinishConfirmModalProps> = ({
  isOpen,
  totalQuestions,
  answeredCount,
  flaggedCount,
  onConfirm,
  onCancel,
  isSubmitting,
}) => {
  const secondsLeft = useTestSessionStore((s) => s.secondsLeft)

  if (!isOpen) return null

  const unansweredCount = totalQuestions - answeredCount
  const hasUnanswered = unansweredCount > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 dark:bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              hasUnanswered ? 'bg-amber-500/10 text-amber-500' : 'bg-accent/10 text-accent'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">Kumpulkan Lembar Jawaban?</h3>
            <p className="text-xs text-ink-muted">Pastikan seluruh soal telah diteliti sebelum submit.</p>
          </div>
        </div>

        {/* Stats summary table */}
        <div className="rounded-md border border-borderline bg-canvas p-4 space-y-2.5 text-xs font-mono">
          <div className="flex justify-between items-center text-ink">
            <span className="text-ink-muted">Total Pertanyaan:</span>
            <span className="font-semibold">{totalQuestions} Soal</span>
          </div>
          <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
            <span>Sudah Dijawab:</span>
            <span className="font-semibold">{answeredCount} Soal</span>
          </div>
          {unansweredCount > 0 && (
            <div className="flex justify-between items-center text-red-500">
              <span>Belum Terisi:</span>
              <span className="font-semibold">{unansweredCount} Soal</span>
            </div>
          )}
          {flaggedCount > 0 && (
            <div className="flex justify-between items-center text-amber-500">
              <span>Masih Ragu-ragu:</span>
              <span className="font-semibold">{flaggedCount} Soal</span>
            </div>
          )}
          <div className="flex justify-between items-center text-ink-muted">
            <span>Sisa Waktu:</span>
            <span className="font-semibold text-ink font-mono">
              {Math.floor(secondsLeft / 60)}m {secondsLeft % 60}s
            </span>
          </div>
        </div>

        {hasUnanswered && (
          <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed bg-amber-500/10 border border-amber-500/20 p-3 rounded">
            ⚠️ Perhatian: Anda masih memiliki <strong>{unansweredCount} soal yang belum dijawab</strong>. Soal kosong tidak akan mendapatkan poin.
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-medium rounded-md border border-borderline bg-surface text-ink hover:bg-surface-hover transition-colors"
          >
            Lanjut Mengerjakan
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-md bg-accent text-white hover:opacity-95 shadow-xs transition-opacity flex items-center space-x-1.5"
          >
            {isSubmitting ? <span>Menyimpan & Menilai...</span> : <span>Ya, Selesaikan Tes</span>}
          </button>
        </div>
      </div>
    </div>
  )
}
