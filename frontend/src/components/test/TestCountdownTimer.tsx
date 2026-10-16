import React from 'react'
import { Clock } from 'lucide-react'
import { useTestSessionStore } from '@/stores/useTestSessionStore'

interface TestCountdownTimerProps {
  className?: string
}

export const TestCountdownTimer: React.FC<TestCountdownTimerProps> = ({ className = '' }) => {
  const secondsLeft = useTestSessionStore((s) => s.secondsLeft)

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600)
    const minutes = Math.floor((secs % 3600) / 60)
    const seconds = secs % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const isWarning = secondsLeft <= 300 && secondsLeft > 60
  const isCritical = secondsLeft <= 60 && secondsLeft > 0

  const statusClasses = isCritical
    ? 'bg-danger-subtle text-danger border-danger-border animate-pulse'
    : isWarning
      ? 'bg-warning-subtle text-warning border-warning-border'
      : 'bg-surface text-ink border-borderline shadow-subtle'

  const iconColor = isCritical ? 'text-danger' : isWarning ? 'text-warning' : 'text-accent'

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-md font-mono text-xs sm:text-sm font-semibold tabular-nums border transition-colors select-none ${statusClasses} ${className}`}
      title={isCritical ? 'Waktu tersisa kurang dari 1 menit!' : isWarning ? 'Waktu tersisa kurang dari 5 menit' : 'Sisa Waktu Ujian'}
    >
      <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${iconColor}`} />
      <span>{formatTime(secondsLeft)}</span>
    </div>
  )
}
