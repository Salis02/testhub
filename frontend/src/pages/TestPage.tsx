import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useTestSessionStore } from '@/stores/useTestSessionStore'
import { TestHeader } from '@/components/test/TestHeader'
import { QuestionCard } from '@/components/test/QuestionCard'
import { QuestionNav } from '@/components/test/QuestionNav'
import { FinishConfirmModal } from '@/components/test/FinishConfirmModal'
import { PaymentModal } from '@/components/common/PaymentModal'
import { ApiError } from '@/services/client'
import { TestPageSkeleton } from '@/components/common/Skeleton'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export const TestPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [paywallModalData, setPaywallModalData] = useState<{
    testId: string
    title: string
    priceIdr: number
  } | null>(null)

  // Atomic selectors from Zustand store
  const session = useTestSessionStore((s) => s.session)
  const questions = useTestSessionStore((s) => s.questions)
  const currentIndex = useTestSessionStore((s) => s.currentIndex)
  const submissions = useTestSessionStore((s) => s.submissions)
  const autoSaveStatus = useTestSessionStore((s) => s.autoSaveStatus)
  const loading = useTestSessionStore((s) => s.loading)
  const isSubmitting = useTestSessionStore((s) => s.isSubmitting)

  const initSession = useTestSessionStore((s) => s.initSession)
  const decrementTimer = useTestSessionStore((s) => s.decrementTimer)
  const setCurrentIndex = useTestSessionStore((s) => s.setCurrentIndex)
  const selectOption = useTestSessionStore((s) => s.selectOption)
  const setEssayAnswer = useTestSessionStore((s) => s.setEssayAnswer)
  const toggleFlag = useTestSessionStore((s) => s.toggleFlag)
  const finishSession = useTestSessionStore((s) => s.finishSession)
  const resetSession = useTestSessionStore((s) => s.resetSession)

  const handleAutoFinish = useCallback(async () => {
    try {
      const resultId = await finishSession()
      navigate(`/results/${resultId}`)
    } catch (err) {
      toast.error('Gagal Menyelesaikan Ujian Otomatis', (err as Error).message)
    }
  }, [finishSession, navigate, toast])

  // Initialize session
  useEffect(() => {
    if (!testId) return
    const activeSessionId = searchParams.get('session')

    initSession(testId, activeSessionId).catch((err) => {
      if (err instanceof ApiError && err.status === 402) {
        const details = (err.details as Record<string, unknown>) || {}
        setPaywallModalData({
          testId,
          title: (details.title as string) || 'Modul Ujian Premium',
          priceIdr: (details.price_idr as number) || 15000,
        })
        return
      }
      toast.error('Gagal Memuat Ujian', (err as Error).message)
      navigate('/')
    })

    return () => {
      resetSession()
    }
  }, [testId, searchParams, initSession, resetSession, navigate, toast])

  // Countdown timer: decrementTimer() updates store without re-rendering TestPage!
  useEffect(() => {
    if (loading || !session) return

    const timer = window.setInterval(() => {
      const isFinished = decrementTimer()
      if (isFinished) {
        clearInterval(timer)
        handleAutoFinish()
      }
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [loading, session, decrementTimer, handleAutoFinish])

  // Auto-scroll ke paling atas pertanyaan saat berpindah butir soal (UX optimal)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentIndex])

  const handleFinalSubmit = async () => {
    try {
      const resultId = await finishSession()
      navigate(`/results/${resultId}`)
    } catch (err) {
      toast.error('Gagal Mengirim Ujian', (err as Error).message)
    }
  }

  if (paywallModalData) {
    return (
      <>
        <TestPageSkeleton />
        <PaymentModal
          isOpen={!!paywallModalData}
          onClose={() => {
            setPaywallModalData(null)
            navigate('/')
          }}
          testId={paywallModalData.testId}
          testTitle={paywallModalData.title}
          priceIdr={paywallModalData.priceIdr}
          onPaymentSuccess={(paidEmail) => {
            const id = paywallModalData.testId
            setPaywallModalData(null)
            initSession(id, null, paidEmail)
          }}
        />
      </>
    )
  }

  if (loading) {
    return <TestPageSkeleton />
  }

  if (!session || questions.length === 0) {
    return null
  }

  const currentQuestion = questions[currentIndex]
  const currentSub = currentQuestion ? submissions[currentQuestion.id] : undefined

  const answeredCount = Object.values(submissions).filter(
    (s) => s.selected_option_id || (s.answer_text && s.answer_text.trim())
  ).length

  const flaggedCount = Object.values(submissions).filter((s) => s.is_flagged).length

  return (
    <div className="min-h-screen flex flex-col bg-canvas transition-colors">
      {/* Sticky Cognitive-Calm Header */}
      <TestHeader
        title={session.test.title}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        answeredCount={answeredCount}
        flaggedCount={flaggedCount}
        onFinishClick={() => setIsModalOpen(true)}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        isDrawerOpen={isDrawerOpen}
      />

      {/* Main Examination Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Center Column: Question Card (max-w-3xl measure) */}
          <div className="lg:col-span-8 space-y-6">
            {currentQuestion && (
              <QuestionCard
                question={currentQuestion}
                submission={currentSub}
                onSelectOption={selectOption}
                onChangeEssay={setEssayAnswer}
                onToggleFlag={toggleFlag}
              />
            )}

            {/* Bottom Question Controls Bar strictly per style.md Section 4.1 */}
            <div className="bg-surface border border-borderline rounded-lg p-4 flex items-center justify-between gap-3 shadow-xs">
              <button
                type="button"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
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
                  onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
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
          <aside className={`lg:col-span-4 ${isDrawerOpen ? 'block' : 'hidden lg:block'}`}>
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
        onConfirm={handleFinalSubmit}
        onCancel={() => setIsModalOpen(false)}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
