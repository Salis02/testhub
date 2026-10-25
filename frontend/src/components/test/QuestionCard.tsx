import React, { useState, useEffect, useRef } from 'react'
import { Question, UserSubmission } from '@/types'
import { DifficultyBadge } from '@/components/common/Badge'
import { Bookmark, CheckCircle2 } from 'lucide-react'

interface QuestionCardProps {
  question: Question
  submission?: UserSubmission
  onSelectOption: (optionId: string) => void
  onChangeEssay: (text: string) => void
  onToggleFlag: () => void
  blockCopyPaste?: boolean
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  submission,
  onSelectOption,
  onChangeEssay,
  onToggleFlag,
  blockCopyPaste = false,
}) => {
  const isFlagged = !!submission?.is_flagged
  const selectedOptionId = submission?.selected_option_id
  const currentAnswerText = submission?.answer_text || ''
  const [localEssayText, setLocalEssayText] = useState(currentAnswerText)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync local text when switching questions
  useEffect(() => {
    setLocalEssayText(submission?.answer_text || '')
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
  }, [question.id, submission?.answer_text])

  const handleEssayChange = (val: string) => {
    setLocalEssayText(val)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      onChangeEssay(val)
    }, 600)
  }

  const handleEssayBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    if (localEssayText !== currentAnswerText) {
      onChangeEssay(localEssayText)
    }
  }

  return (
    <div className="bg-surface border border-borderline rounded-lg shadow-sm p-6 sm:p-8 transition-colors">
      {/* Top Metadata Bar */}
      <div className="flex items-center justify-between border-b border-borderline/60 pb-4 mb-6 gap-3">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface border border-borderline text-ink">
            SOAL #{question.question_number}
          </span>
          <span className="text-xs text-ink-muted">
            Bobot: {question.points} Poin
          </span>
          <DifficultyBadge level={question.difficulty_level} />
        </div>

        {/* Flag Question Button (Tandai Ragu-ragu) */}
        <button
          type="button"
          onClick={onToggleFlag}
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium border btn-press focus-ring transition-colors ${
            isFlagged
              ? 'bg-warning-subtle text-warning border-warning-border shadow-subtle'
              : 'bg-surface text-ink-muted border-borderline hover:text-ink hover:bg-surface-hover'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isFlagged ? 'fill-warning text-warning' : ''}`} />
          <span>{isFlagged ? 'Ditandai Ragu-ragu' : 'Tandai Ragu'}</span>
        </button>
      </div>

      {/* Question Text (Heading 2 per style.md) */}
      <div className="mb-8">
        <h2 className={`text-lg sm:text-xl font-medium text-ink leading-relaxed tracking-normal ${blockCopyPaste ? 'select-none' : 'select-text'}`}>
          {question.question_text}
        </h2>
      </div>

      {/* Optional Media */}
      {question.media_url && (
        <div className="mb-6 rounded-md overflow-hidden border border-borderline bg-canvas p-2">
          <img
            src={question.media_url}
            alt={`Ilustrasi Soal ${question.question_number}`}
            className="max-h-72 w-auto mx-auto object-contain rounded"
          />
        </div>
      )}

      {/* Answer Options: Multiple Choice */}
      {question.question_type === 'multiple_choice' && (
        <div className="space-y-3" role="radiogroup" aria-label="Pilihan Jawaban">
          {question.options.map((opt, idx) => {
            const isSelected = selectedOptionId === opt.id

            return (
              <div
                key={opt.id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectOption(opt.id)
                  }
                }}
                onClick={() => onSelectOption(opt.id)}
                className={`group relative flex items-start p-4 rounded-lg border cursor-pointer select-none transition-all duration-150 btn-press focus-ring ${
                  isSelected
                    ? 'border-accent bg-accent-tint ring-1 ring-accent/30 shadow-subtle'
                    : 'border-borderline bg-surface hover:border-accent/40 hover:bg-surface-hover'
                }`}
              >
                {/* Letter Box (A, B, C, D, E) per style.md */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center font-mono font-semibold text-xs transition-all ${
                    isSelected
                      ? 'bg-accent text-white shadow-subtle'
                      : 'bg-canvas text-ink border border-borderline group-hover:border-accent/50'
                  }`}
                >
                  {opt.option_letter}
                </div>

                {/* Option Text */}
                <div className="ml-3.5 flex-1 pt-1">
                  <p className={`text-sm sm:text-base leading-relaxed transition-colors ${
                    isSelected ? 'text-ink font-medium' : 'text-ink/90'
                  }`}>
                    {opt.option_text}
                  </p>
                </div>

                {/* Status indicator on right */}
                <div className="ml-2 flex-shrink-0 pt-1.5 flex items-center space-x-2">
                  <span className="text-[10px] font-mono text-ink-muted opacity-0 group-hover:opacity-70 transition-opacity hidden sm:inline">
                    [{idx + 1}]
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0 animate-in fade-in zoom-in-95" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Answer Options: Essay Input */}
      {question.question_type === 'essay' && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-ink-muted uppercase tracking-wider">
            Lembar Jawaban Esai Analitis:
          </label>
          <textarea
            rows={7}
            value={localEssayText}
            onChange={(e) => handleEssayChange(e.target.value)}
            onBlur={handleEssayBlur}
            placeholder="Tuliskan elaborasi jawaban Saudara secara sistematis, komprehensif, dan berbasis bukti..."
            className="w-full p-4 rounded-lg border border-borderline bg-canvas text-ink text-sm sm:text-base focus-ring focus:border-accent transition-all resize-y shadow-subtle"
          />
          <div className="flex justify-between items-center text-xs text-ink-muted pt-1">
            <span className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              <span>Disimpan otomatis ke cloud storage.</span>
            </span>
            <span className="font-mono">{localEssayText.length} karakter</span>
          </div>
        </div>
      )}
    </div>
  )
}
