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
    <div className="bg-surface border border-borderline rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-borderline pb-3 mb-4">
        <h3 className="text-sm font-semibold text-ink">Nomor Soal</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded hover:bg-surface-hover text-ink-muted"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-muted mb-4 pb-3 border-b border-borderline font-mono">
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-accent text-white flex items-center justify-center text-[9px] font-bold">✓</span>
          <span>Terjawab</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500 text-amber-600 flex items-center justify-center text-[9px]">⚐</span>
          <span>Ragu-ragu</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded bg-surface border border-borderline flex items-center justify-center text-[9px]"></span>
          <span>Belum Jawab</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-3.5 h-3.5 rounded ring-2 ring-accent border border-accent flex items-center justify-center text-[9px]">●</span>
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

          let buttonClasses = 'border-borderline bg-surface text-ink hover:bg-surface-hover'

          if (isFlagged) {
            buttonClasses = 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 font-semibold'
          } else if (isAnswered) {
            buttonClasses = 'bg-accent text-white border-accent font-semibold shadow-xs'
          }

          if (isCurrent) {
            buttonClasses += ' ring-2 ring-accent ring-offset-2 ring-offset-canvas'
          }

          return (
            <button
              key={q.id}
              onClick={() => onSelectIndex(idx)}
              className={`h-9 rounded font-mono text-xs flex items-center justify-center transition-all ${buttonClasses}`}
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
