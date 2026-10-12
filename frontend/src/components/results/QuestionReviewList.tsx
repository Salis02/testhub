import React, { useState } from 'react'
import { Question, UserSubmission } from '@/types'
import { CheckCircle2, XCircle, BookOpen, Bookmark } from 'lucide-react'

interface QuestionReviewListProps {
  questions: Question[]
  submissions: Record<string, UserSubmission>
}

type FilterType = 'all' | 'correct' | 'incorrect' | 'flagged'

export const QuestionReviewList: React.FC<QuestionReviewListProps> = ({
  questions,
  submissions,
}) => {
  const [filter, setFilter] = useState<FilterType>('all')

  const getQuestionStatus = (q: Question) => {
    const sub = submissions[q.id]
    if (q.question_type === 'essay') {
      return { isEssay: true, isCorrect: false }
    }
    const correctOpt = q.options.find((o) => o.is_correct)
    const isCorrect = !!(sub?.selected_option_id && correctOpt && sub.selected_option_id === correctOpt.id)
    return { isEssay: false, isCorrect }
  }

  const filteredQuestions = questions.filter((q) => {
    const sub = submissions[q.id]
    const { isEssay, isCorrect } = getQuestionStatus(q)

    if (filter === 'all') return true
    if (filter === 'flagged') return !!sub?.is_flagged
    if (filter === 'correct') return isCorrect
    if (filter === 'incorrect') return !isCorrect && !isEssay
    return true
  })

  return (
    <div className="space-y-6">
      {/* Review Mode Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-borderline gap-4">
        <div>
          <h3 className="text-base font-semibold text-ink flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <span>Pembahasan & Kunci Jawaban Lengkap</span>
          </h3>
          <p className="text-xs text-ink-muted mt-0.5">
            Pelajari konsep dan rasionalisasi setiap butir soal untuk persiapan tes berikutnya.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 p-1 rounded-md bg-canvas border border-borderline text-xs font-mono">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded transition-colors ${
              filter === 'all'
                ? 'bg-surface text-ink font-semibold shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Semua ({questions.length})
          </button>
          <button
            onClick={() => setFilter('correct')}
            className={`px-3 py-1 rounded transition-colors ${
              filter === 'correct'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Benar
          </button>
          <button
            onClick={() => setFilter('incorrect')}
            className={`px-3 py-1 rounded transition-colors ${
              filter === 'incorrect'
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-semibold shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Salah
          </button>
          <button
            onClick={() => setFilter('flagged')}
            className={`px-3 py-1 rounded transition-colors ${
              filter === 'flagged'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold shadow-xs'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Ragu
          </button>
        </div>
      </div>

      {/* Question Cards List */}
      <div className="space-y-6">
        {filteredQuestions.map((q) => {
          const sub = submissions[q.id]
          const { isEssay, isCorrect } = getQuestionStatus(q)
          const userSelectedOption = q.options.find((o) => o.id === sub?.selected_option_id)

          return (
            <div
              key={q.id}
              className="bg-surface border border-borderline rounded-lg p-6 sm:p-7 shadow-sm transition-colors space-y-5"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-borderline/60 pb-3">
                <div className="flex items-center space-x-3">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-canvas border border-borderline text-ink">
                    SOAL #{q.question_number}
                  </span>
                  <span className="text-xs text-ink-muted">
                    Bobot: {q.points} Poin
                  </span>
                  {sub?.is_flagged && (
                    <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      <Bookmark className="w-3 h-3 fill-amber-500" />
                      <span>Ragu-ragu</span>
                    </span>
                  )}
                </div>

                {/* Status indicator */}
                <div>
                  {isEssay ? (
                    <span className="text-xs font-mono text-ink-muted bg-canvas px-2.5 py-1 rounded border border-borderline">
                      Esai (Menunggu Review)
                    </span>
                  ) : isCorrect ? (
                    <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Jawaban Benar</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-2.5 py-1 rounded border border-red-500/20">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Jawaban Salah / Kosong</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <p className="text-sm sm:text-base font-medium text-ink leading-relaxed">
                {q.question_text}
              </p>

              {/* Options Breakdown for Multiple Choice */}
              {q.question_type === 'multiple_choice' && (
                <div className="space-y-2 pt-1">
                  {q.options.map((opt) => {
                    const isUserChoice = userSelectedOption?.id === opt.id
                    const isTheCorrectOne = opt.is_correct

                    let optClasses = 'border-borderline bg-canvas text-ink/80'

                    if (isTheCorrectOne) {
                      optClasses = 'border-emerald-500/50 bg-emerald-500/10 text-ink font-medium'
                    } else if (isUserChoice && !isTheCorrectOne) {
                      optClasses = 'border-red-500/50 bg-red-500/10 text-ink line-through'
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`flex items-start p-3 rounded border text-xs sm:text-sm ${optClasses}`}
                      >
                        <span className={`w-5 h-5 rounded font-mono text-xs flex items-center justify-center font-bold mr-3 flex-shrink-0 ${
                          isTheCorrectOne
                            ? 'bg-emerald-600 text-white'
                            : isUserChoice
                            ? 'bg-red-500 text-white'
                            : 'bg-surface border border-borderline text-ink-muted'
                        }`}>
                          {opt.option_letter}
                        </span>
                        <div className="flex-1">
                          <span>{opt.option_text}</span>
                          {isTheCorrectOne && (
                            <span className="ml-2 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                              (Kunci Jawaban)
                            </span>
                          )}
                          {isUserChoice && !isTheCorrectOne && (
                            <span className="ml-2 text-[11px] font-semibold text-red-500 font-mono">
                              (Jawaban Anda)
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* User Essay Response display */}
              {q.question_type === 'essay' && (
                <div className="p-4 rounded-md bg-canvas border border-borderline text-xs sm:text-sm">
                  <span className="font-semibold text-ink-muted block text-xs uppercase tracking-wider mb-1">
                    Jawaban yang Anda Submit:
                  </span>
                  <p className="text-ink leading-relaxed whitespace-pre-wrap">
                    {sub?.answer_text || '(Tidak menjawab)'}
                  </p>
                </div>
              )}

              {/* Admin Explanation Card per style.md Section 4.2:
                  "Kotak penjelasan (admin-defined explanation) memiliki latar belakang kontras lembut dengan border tipis di sisi kiri (3px accent stroke)" */}
              {q.explanation && (
                <div className="mt-4 p-4 rounded-r-md bg-accent/5 border-l-[3px] border-accent border-y border-r border-borderline/50 text-xs sm:text-sm">
                  <h4 className="font-semibold text-accent uppercase tracking-wider text-xs mb-1.5 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Pembahasan & Rasionalisasi:</span>
                  </h4>
                  <p className="text-ink/90 leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          )
        })}

        {filteredQuestions.length === 0 && (
          <div className="text-center py-12 bg-surface border border-borderline rounded-lg text-ink-muted text-sm">
            Tidak ada soal dalam filter ini.
          </div>
        )}
      </div>
    </div>
  )
}
