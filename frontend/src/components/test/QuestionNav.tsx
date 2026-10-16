import React from 'react'
import { Question, UserSubmission } from '@/types'
import { X } from 'lucide-react'

interface QuestionNavProps {
  questions: Question[]
  currentIndex: number
  submissions: Record<string, UserSubmission>
  onSelectIndex: (index: number) => void
  onClose?: () => void
}

export const QuestionNav: React.FC<QuestionNavProps> = ({
  questions,
  currentIndex,
  submissions,
  onSelectIndex,
  onClose,
}) => {
  return (
    <div className="bg-surface surface-card border border-borderline rounded-lg p-5 shadow-card">
      <div className="flex items-center justify-between border-b border-borderline pb-3 mb-4">
        <h3 className="text-sm font-semibold text-ink">Nomor Soal</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-md hover:bg-surface-hover text-ink-muted btn-press focus-ring transition-colors cursor-pointer"
            aria-label="Tutup Navigasi Soal"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted mb-4 pb-3 border-b border-borderline font-mono select-none">
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-accent text-white flex items-center justify-center text-[9px] font-bold shadow-subtle">✓</span>
          <span>Terjawab</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-warning-subtle border border-warning-border text-warning flex items-center justify-center text-[9px] font-bold">⚐</span>
          <span>Ragu-ragu</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-surface border border-borderline flex items-center justify-center text-[9px]"></span>
          <span>Belum Jawab</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded ring-2 ring-accent border border-accent flex items-center justify-center text-[9px] font-bold text-accent">●</span>
          <span>Aktif</span>
        </div>
      </div>

      {/* Grid of question buttons */}
      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 gap-2 max-h-[360px] overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const sub = submissions[q.id]
          const isAnswered =
            q.question_type === 'multiple_choice'
              ? !!sub?.selected_option_id
              : !!sub?.answer_text?.trim()
          const isFlagged = !!sub?.is_flagged
          const isCurrent = currentIndex === idx

          let buttonClasses = 'border-borderline bg-surface text-ink hover:bg-surface-hover hover:border-ink/30'

          if (isFlagged) {
            buttonClasses = 'bg-warning-subtle border-warning-border text-warning font-semibold'
          } else if (isAnswered) {
            buttonClasses = 'bg-accent text-white border-accent font-semibold shadow-subtle hover:brightness-105'
          }

          if (isCurrent) {
            buttonClasses += ' ring-2 ring-accent ring-offset-2 ring-offset-canvas'
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              className={`h-9 rounded-md font-mono text-xs flex items-center justify-center border btn-press focus-ring transition-all cursor-pointer ${buttonClasses}`}
              title={`Nomor ${idx + 1}${isFlagged ? ' (Ragu)' : isAnswered ? ' (Terjawab)' : ' (Kosong)'}`}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}
