import React from 'react'
import { ChevronLeft, Check, Maximize2, Minimize2 } from 'lucide-react'
import { TestCountdownTimer } from '@/components/test/TestCountdownTimer'

interface TestHeaderProps {
  title: string
  currentIndex: number
  totalQuestions: number
  answeredCount: number
  flaggedCount: number
  onFinishClick: () => void
  onToggleDrawer: () => void
  isDrawerOpen: boolean
  isFullscreen?: boolean
  violations?: number
  onToggleFullscreen?: () => void
  onBackToHome?: () => void
}

export const TestHeader: React.FC<TestHeaderProps> = ({
  title,
  currentIndex,
  totalQuestions,
  answeredCount,
  flaggedCount,
  onFinishClick,
  onToggleDrawer,
  isDrawerOpen,
  isFullscreen = false,
  violations = 0,
  onToggleFullscreen,
  onBackToHome,
}) => {
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  return (
    <header className="sticky top-0 z-30 w-full bg-surface border-b border-borderline shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Test Title & Exit confirmation */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            title="Kembali ke Beranda"
            aria-label="Kembali ke Beranda"
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover btn-press focus-ring transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-ink truncate">
              {title}
            </h1>
            <p className="text-xs text-ink-muted hidden sm:block">
              Soal {currentIndex + 1} dari {totalQuestions} • {answeredCount} terjawab{flaggedCount > 0 ? ` • ${flaggedCount} ragu` : ''}
            </p>
          </div>
        </div>

        {/* Right: Tabular Timer & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
          {/* Question Grid Toggle Button (Mobile/Tablet only, since desktop has QuestionNav sidebar) */}
          <button
            onClick={onToggleDrawer}
            className={`lg:hidden px-2.5 sm:px-3 py-1.5 text-xs font-mono font-medium rounded-md border btn-press focus-ring transition-colors cursor-pointer ${
              isDrawerOpen
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-ink border-borderline hover:bg-surface-hover'
            }`}
          >
            <span className="hidden sm:inline">Daftar Soal</span>
            <span className="sm:hidden">Soal</span> ({answeredCount}/{totalQuestions})
          </button>

          {/* Isolated Tabular Numerals Countdown Timer */}
          <TestCountdownTimer />

          {/* Fullscreen Focus Mode Button */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-md border text-xs font-medium inline-flex items-center space-x-1.5 btn-press focus-ring transition-colors cursor-pointer ${
                isFullscreen
                  ? 'bg-accent/10 border-accent/30 text-accent hover:bg-accent/20'
                  : 'bg-surface border-borderline text-ink-muted hover:text-ink hover:bg-surface-hover'
              }`}
              title={isFullscreen ? 'Keluar dari Layar Penuh' : 'Masuk Mode Layar Penuh (Fokus CAT)'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">Keluar Fokus</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">Layar Penuh</span>
                </>
              )}
            </button>
          )}

          {/* Violations Warning Pill */}
          {violations > 0 && (
            <span
              className="hidden lg:inline-flex items-center px-2 py-0.5 text-[10px] font-mono rounded bg-warning-subtle text-warning border border-warning-border"
              title="Peringatan integritas ujian terdeteksi"
            >
              ⚠️ {violations} Peringatan
            </span>
          )}

          {/* Finish Button - The SINGLE prominent submit button in navbar */}
          <button
            type="button"
            onClick={onFinishClick}
            className="inline-flex items-center space-x-1.5 px-3.5 sm:px-4 py-1.5 text-xs font-semibold rounded-md bg-accent text-white hover:opacity-90 shadow-sm border border-transparent transition-all shrink-0 cursor-pointer"
            title="Selesaikan dan kumpulkan lembar jawaban"
          >
            <Check className="w-4 h-4 text-white shrink-0" />
            <span className="hidden sm:inline">Kumpulkan Ujian</span>
            <span className="sm:hidden">Kumpulkan</span>
          </button>
        </div>
      </div>

      {/* Thin Accent Progress Bar (3px) at bottom of sticky header strictly per style.md Section 4.1 */}
      <div className="w-full bg-borderline/40 h-[3px]">
        <div
          className="bg-accent h-[3px] transition-all duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </header>
  )
}
