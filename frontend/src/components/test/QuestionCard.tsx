import React from 'react'
import { Question, UserSubmission } from '@/types'
import { DifficultyBadge } from '@/components/common/Badge'
import { Bookmark, CheckCircle2 } from 'lucide-react'

interface QuestionCardProps {
  question: Question
  submission?: UserSubmission
  onSelectOption: (optionId: string) => void
  onChangeEssay: (text: string) => void
  onToggleFlag: () => void
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  submission,
  onSelectOption,
  onChangeEssay,
  onToggleFlag,
}) => {
  const isFlagged = !!submission?.is_flagged
  const selectedOptionId = submission?.selected_option_id
  const essayText = submission?.answer_text || ''

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
          className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium border transition-colors ${
            isFlagged
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/40'
              : 'bg-surface text-ink-muted border-borderline hover:text-ink hover:bg-surface-hover'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
          <span>{isFlagged ? 'Ditandai Ragu-ragu' : 'Tandai Ragu'}</span>
        </button>
      </div>

      {/* Question Text (Heading 2 per style.md) */}
      <div className="mb-8">
        <h2 className="text-lg sm:text-xl font-medium text-ink leading-relaxed tracking-normal select-text">
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
        <div className="space-y-3">
          {question.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id

            return (
              <div
                key={opt.id}
                onClick={() => onSelectOption(opt.id)}
                className={`group relative flex items-start p-4 rounded-md border cursor-pointer transition-all duration-150 select-none ${
                  isSelected
                    ? 'border-accent bg-accent/10 shadow-xs'
                    : 'border-borderline bg-surface hover:border-ink-muted/50 hover:bg-surface-hover'
                }`}
              >
                {/* Letter Box (A, B, C, D, E) per style.md Section 4.1 */}
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center font-mono font-semibold text-xs transition-colors ${
                    isSelected
                      ? 'bg-accent text-white shadow-xs'
                      : 'bg-canvas text-ink border border-borderline group-hover:border-ink-muted'
                  }`}
                >
                  {opt.option_letter}
                </div>

                {/* Option Text */}
                <div className="ml-3.5 flex-1 pt-0.5">
                  <p className={`text-sm sm:text-base leading-snug transition-colors ${
                    isSelected ? 'text-ink font-medium' : 'text-ink/90'
                  }`}>
                    {opt.option_text}
                  </p>
                </div>

                {/* Check indicator if selected */}
                {isSelected && (
                  <CheckCircle2 className="w-4 h-4 text-accent ml-2 flex-shrink-0 mt-1" />
                )}
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
            value={essayText}
            onChange={(e) => onChangeEssay(e.target.value)}
            placeholder="Tuliskan elaborasi jawaban Saudara secara sistematis, komprehensif, dan berbasis bukti..."
            className="w-full p-4 rounded-md border border-borderline bg-canvas text-ink text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors resize-y"
          />
          <div className="flex justify-between items-center text-xs text-ink-muted pt-1">
            <span>Disimpan otomatis ke cloud storage.</span>
            <span className="font-mono">{essayText.length} karakter</span>
          </div>
        </div>
      )}
    </div>
  )
}
