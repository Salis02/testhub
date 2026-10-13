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

  const isLowTime = secondsLeft < 300 && secondsLeft > 0

  return (
    <div
      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-mono text-sm font-semibold tabular-nums border transition-colors ${
        isLowTime
          ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30 animate-pulse'
          : 'bg-surface text-ink border-borderline'
      } ${className}`}
    >
      <Clock className={`w-4 h-4 ${isLowTime ? 'text-red-500' : 'text-accent'}`} />
      <span>{formatTime(secondsLeft)}</span>
    </div>
  )
}
