import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useTestSessionStore } from '@/stores/useTestSessionStore'
import { TestHeader } from '@/components/test/TestHeader'
import { QuestionCard } from '@/components/test/QuestionCard'
import { QuestionNav } from '@/components/test/QuestionNav'
import { FinishConfirmModal } from '@/components/test/FinishConfirmModal'
import { ProctoringWarningModal } from '@/components/test/ProctoringWarningModal'
import { ProctoringPreExamModal } from '@/components/test/ProctoringPreExamModal'
import { PaymentModal } from '@/components/common/PaymentModal'
import { ApiError } from '@/services/client'
import { TestPageSkeleton } from '@/components/common/Skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import { useExamProctoring } from '@/hooks/useExamProctoring'

export const TestPage: React.FC = () => {
  const { testId } = useParams<{ testId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { confirm } = useConfirm()

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

  // Granular proctoring flags configured by admin on this test
  const requireFullscreen = Boolean(session?.test?.require_fullscreen)
  const detectTabSwitch = Boolean(session?.test?.detect_tab_switch)
  const blockCopyPaste = Boolean(session?.test?.block_copy_paste)
  const maxViolations = session?.test?.max_violations || 3
  const hasProctoring = requireFullscreen || detectTabSwitch || blockCopyPaste

  // Examinee pre-exam confirmation state (pra-melanggar)
  const [isPreExamConfirmed, setIsPreExamConfirmed] = useState(false)

  const handleAutoFinish = useCallback(async () => {
    try {
      const resultId = await finishSession()
      navigate(`/results/${resultId}`)
    } catch (err) {
      toast.error('Gagal Menyelesaikan Ujian Otomatis', (err as Error).message)
    }
  }, [finishSession, navigate, toast])

  const handleBackToHome = useCallback(async () => {
    const isConfirmed = await confirm({
      title: 'Tinggalkan Halaman Ujian?',
      message:
        'Ujian Anda masih berlangsung. Jawaban yang telah Anda pilih sudah otomatis tersimpan ke server, namun timer ujian akan terus berjalan di latar belakang. Anda yakin ingin kembali ke beranda?',
      confirmText: 'Ya, Kembali ke Beranda',
      cancelText: 'Lanjutkan Ujian',
      variant: 'warning',
    })

    if (isConfirmed) {
      navigate('/')
    }
  }, [confirm, navigate])

  // Prevent accidental tab closure or browser reload during an active exam
  useEffect(() => {
    if (!session || isSubmitting) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [session, isSubmitting])

  // Anti-Cheat & Web Proctoring Suite (arms only after examinee confirms pre-exam briefing)
  const proctoring = useExamProctoring({
    enabled: !loading && !!session && !paywallModalData && hasProctoring,
    requireFullscreen,
    detectTabSwitch,
    blockCopyPaste,
    maxViolations,
    isArmed: isPreExamConfirmed,
    onMaxViolationsReached: () => {
      toast.error(
        'Batas Pelanggaran Terlampaui',
        'Ujian otomatis dihentikan dan jawaban dikirim karena batas pelanggaran telah terlampaui.'
      )
      handleAutoFinish()
    },
  })

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

  // Countdown timer: timer is paused until examinee confirms pre-exam briefing!
  useEffect(() => {
    if (loading || !session || (hasProctoring && !isPreExamConfirmed)) return

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
  }, [loading, session, hasProctoring, isPreExamConfirmed, decrementTimer, handleAutoFinish])

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
        isFullscreen={hasProctoring ? proctoring.isFullscreen : undefined}
        violations={hasProctoring ? proctoring.violations : 0}
        onToggleFullscreen={hasProctoring ? proctoring.toggleFullscreen : undefined}
        onBackToHome={handleBackToHome}
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
                blockCopyPaste={blockCopyPaste}
              />
            )}

            {/* Bottom Question Controls Bar */}
            <div className="bg-surface border border-borderline rounded-lg p-4 flex items-center justify-between gap-3 shadow-card">
              <button
                type="button"
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md border border-borderline bg-canvas text-xs font-semibold text-ink hover:bg-surface-hover hover:border-ink/20 disabled:opacity-30 disabled:cursor-not-allowed btn-press focus-ring shadow-subtle transition-all cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              {/* Status save tag */}
              <div className="text-[11px] font-mono text-ink-muted hidden sm:flex items-center space-x-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                <span>{autoSaveStatus}</span>
              </div>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                  className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-md bg-accent text-white text-xs font-semibold hover:brightness-105 btn-press focus-ring shadow-subtle transition-all cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="text-[11px] font-mono text-ink-muted italic hidden sm:block">
                  Butir soal terakhir
                </div>
              )}
            </div>
          </div>

          {/* Mobile Drawer Overlay */}
          {isDrawerOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
              <div
                className="fixed inset-0 bg-ink/50 backdrop-blur-xs transition-opacity"
                onClick={() => setIsDrawerOpen(false)}
              />
              <div className="relative w-full max-w-xs h-full bg-surface border-l border-borderline p-4 overflow-y-auto z-10 shadow-2xl">
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
            </div>
          )}

          {/* Desktop Right Column: Question Navigator Palette */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24">
              <QuestionNav
                questions={questions}
                currentIndex={currentIndex}
                submissions={submissions}
                onSelectIndex={(idx) => {
                  setCurrentIndex(idx)
                }}
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

      {/* Pre-Exam Integrity Briefing Modal (Pra-Melanggar: Konfirmasi Sebelum Mulai) */}
      <ProctoringPreExamModal
        isOpen={hasProctoring && !isPreExamConfirmed && !loading && !!session && !paywallModalData}
        requireFullscreen={requireFullscreen}
        detectTabSwitch={detectTabSwitch}
        blockCopyPaste={blockCopyPaste}
        maxViolations={maxViolations}
        testTitle={session.test.title}
        onConfirmAndStart={async () => {
          if (requireFullscreen) {
            await proctoring.enterFullscreen()
          }
          setIsPreExamConfirmed(true)
        }}
      />

      {/* Anti-Cheat & Integrity Warning Modal (Hanya muncul jika sudah briefing & melanggar) */}
      {hasProctoring && isPreExamConfirmed && (
        <ProctoringWarningModal
          isOpen={proctoring.warningModalOpen}
          violations={proctoring.violations}
          maxViolations={maxViolations}
          warningReason={proctoring.warningReason}
          isFullscreen={proctoring.isFullscreen}
          onDismiss={proctoring.dismissWarning}
          onEnterFullscreen={proctoring.enterFullscreen}
        />
      )}
    </div>
  )
}
