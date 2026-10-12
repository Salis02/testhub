import React, { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Question, TestSession, UserSubmission } from '@/types'
import { api } from '@/services/api'
import { TestHeader } from '@/components/test/TestHeader'
import { QuestionCard } from '@/components/test/QuestionCard'
import { QuestionNav } from '@/components/test/QuestionNav'
import { FinishConfirmModal } from '@/components/test/FinishConfirmModal'
import { TestPageSkeleton } from '@/components/common/Skeleton'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

export const TestPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [session, setSession] = useState<TestSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submissions, setSubmissions] = useState<Record<string, UserSubmission>>({})
  const [secondsLeft, setSecondsLeft] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Tersinkronisasi')

  const initialDurationRef = useRef<number>(0)
  const timerIntervalRef = useRef<number | null>(null)

  // Initialize session
  useEffect(() => {
    initSession()
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
    }
  }, [testId])

  const initSession = async () => {
    try {
      setLoading(true)
      let activeSessionId = searchParams.get('session')

      if (!activeSessionId && testId) {
        const createdSession = await api.startTest(testId)
        activeSessionId = createdSession.session_id
      }

      if (!activeSessionId) {
        throw new Error('Sesi ujian tidak valid.')
      }

      const { test, questions: qList } = await api.getSessionQuestions(activeSessionId)
      if (qList.length === 0) {
        throw new Error('Modul ini belum memiliki butir soal aktif.')
      }

      const existingSubs = await api.getSubmissions(activeSessionId)

      const sess: TestSession = {
        session_id: activeSessionId,
        test,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      }

      setSession(sess)
      setQuestions(qList)
      setSubmissions(existingSubs)

      const totalSecs = test.duration_minutes * 60
      initialDurationRef.current = totalSecs
      setSecondsLeft(totalSecs)

      // Start countdown timer
      timerIntervalRef.current = window.setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current)
            handleAutoFinish(activeSessionId!)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      alert((err as Error).message)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const handleAutoFinish = async (sessionId: string) => {
    try {
      setIsSubmitting(true)
      const res = await api.finishTest(sessionId, initialDurationRef.current)
      navigate(`/results/${res.id}`)
    } catch (err) {
      alert('Gagal menyelesaikan ujian: ' + (err as Error).message)
    }
  }

  const handleSelectOption = async (optionId: string) => {
    if (!session || questions.length === 0) return
    const currentQ = questions[currentIndex]

    const updated = {
      ...submissions,
      [currentQ.id]: {
        ...submissions[currentQ.id],
        question_id: currentQ.id,
        selected_option_id: optionId,
      },
    }
    setSubmissions(updated)
    triggerAutoSave(currentQ.id, { optionId })
  }

  const handleChangeEssay = (text: string) => {
    if (!session || questions.length === 0) return
    const currentQ = questions[currentIndex]

    const updated = {
      ...submissions,
      [currentQ.id]: {
        ...submissions[currentQ.id],
        question_id: currentQ.id,
        answer_text: text,
      },
    }
    setSubmissions(updated)
    triggerAutoSave(currentQ.id, { answerText: text })
  }

  const handleToggleFlag = () => {
    if (!session || questions.length === 0) return
    const currentQ = questions[currentIndex]
    const curFlag = !!submissions[currentQ.id]?.is_flagged

    const updated = {
      ...submissions,
      [currentQ.id]: {
        ...submissions[currentQ.id],
        question_id: currentQ.id,
        is_flagged: !curFlag,
      },
    }
    setSubmissions(updated)
    triggerAutoSave(currentQ.id, { isFlagged: !curFlag })
  }

  const triggerAutoSave = async (
    questionId: string,
    payload: { optionId?: string; answerText?: string; isFlagged?: boolean }
  ) => {
    if (!session) return
    try {
      setAutoSaveStatus('Menyimpan...')
      await api.submitAnswer(session.session_id, questionId, payload)
      setAutoSaveStatus('Tersimpan')
    } catch {
      setAutoSaveStatus('Gagal simpan')
    }
  }

  const handleFinalSubmit = async () => {
    if (!session) return
    try {
      setIsSubmitting(true)
      const timeSpent = initialDurationRef.current - secondsLeft
      const res = await api.finishTest(session.session_id, Math.max(1, timeSpent))
      navigate(`/results/${res.id}`)
    } catch (err) {
      alert((err as Error).message)
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <TestPageSkeleton />
  }

  if (!session || questions.length === 0) {
    return null
  }

  const currentQuestion = questions[currentIndex]
  const currentSub = submissions[currentQuestion.id]

  const answeredCount = Object.values(submissions).filter(
    (s) => s.selected_option_id || (s.answer_text && s.answer_text.trim())
  ).length

  const flaggedCount = Object.values(submissions).filter((s) => s.is_flagged).length

  return (
    <div className="min-h-screen flex flex-col bg-canvas transition-colors">
      {/* Sticky Cognitive-Calm Header */}
      <TestHeader
        title={session.test.title}
        secondsLeft={secondsLeft}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        flaggedCount={flaggedCount}
        onFinishClick={() => setIsModalOpen(true)}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        isDrawerOpen={isDrawerOpen}
      />

      {/* Main Examination Layout (max-w-7xl with measure strictly per style.md Section 3.2: max-w-3xl for question container) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Center Column: Question Card (max-w-3xl measure) */}
          <div className="lg:col-span-8 space-y-6">
            <QuestionCard
              question={currentQuestion}
              submission={currentSub}
              onSelectOption={handleSelectOption}
              onChangeEssay={handleChangeEssay}
              onToggleFlag={handleToggleFlag}
            />

            {/* Bottom Question Controls Bar strictly per style.md Section 4.1 */}
            <div className="bg-surface border border-borderline rounded-lg p-4 flex items-center justify-between gap-3 shadow-xs">
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md border border-borderline bg-canvas text-xs font-semibold text-ink hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              {/* Status save tag */}
              <div className="text-[11px] font-mono text-ink-muted hidden sm:flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{autoSaveStatus}</span>
              </div>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Kumpulkan Jawaban</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Question Navigator Palette */}
          <aside
            className={`lg:col-span-4 ${
              isDrawerOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="sticky top-24">
              <QuestionNav
                questions={questions}
                currentIndex={currentIndex}
                submissions={submissions}
                onSelectIndex={(idx) => {
                  setCurrentIndex(idx)
                  setIsDrawerOpen(false)
                }}
                onClose={() => setIsDrawerOpen(false)}
              />
            </div>
          </aside>
        </div>
      </main>

      {/* Confirmation Modal */}
      <FinishConfirmModal
        isOpen={isModalOpen}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        flaggedCount={flaggedCount}
        secondsLeft={secondsLeft}
        onConfirm={handleFinalSubmit}
        onCancel={() => setIsModalOpen(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
