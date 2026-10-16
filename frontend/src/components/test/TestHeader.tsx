import React from 'react'
import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
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
}) => {
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  return (
    <header className="sticky top-0 z-30 w-full bg-surface border-b border-borderline shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Test Title & Exit confirmation */}
        <div className="flex items-center space-x-3 min-w-0">
          <Link
            to="/"
            title="Kembali ke Beranda"
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
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

          {/* Finish Button - Always prominently visible */}
          <button
            onClick={onFinishClick}
            className="inline-flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md bg-success text-white hover:brightness-105 btn-press focus-ring shadow-subtle transition-all shrink-0 cursor-pointer"
            title="Selesaikan dan kumpulkan lembar jawaban"
          >
            <span>Kumpulkan</span>
            <span className="hidden md:inline">Ujian</span>
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
