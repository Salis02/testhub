import React from 'react'
import { TestCategory, DifficultyLevel } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'outline'
  size?: 'sm' | 'md'
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  const variantClasses = {
    default: 'bg-surface border border-borderline text-ink',
    accent: 'bg-accent/10 border border-accent/20 text-accent font-medium',
    success: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium',
    warning: 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium',
    outline: 'border border-borderline text-ink-muted',
  }[variant]

  return (
    <span className={`inline-flex items-center rounded font-mono uppercase tracking-wider ${sizeClasses} ${variantClasses}`}>
      {children}
    </span>
  )
}

export const CategoryBadge: React.FC<{ category: TestCategory }> = ({ category }) => {
  const map: Record<TestCategory, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
    cpns: { label: 'CPNS / Kedinasan', variant: 'accent' },
    sbmptn: { label: 'UTBK-SNBT', variant: 'success' },
    iq: { label: 'Raven IQ Matrix', variant: 'default' },
    custom: { label: 'BUMN AKHLAK', variant: 'warning' },
  }

  const { label, variant } = map[category] || { label: category, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

export const DifficultyBadge: React.FC<{ level: DifficultyLevel }> = ({ level }) => {
  const map: Record<DifficultyLevel, { label: string; variant: 'default' | 'accent' | 'warning' }> = {
    easy: { label: 'Mudah', variant: 'default' },
    medium: { label: 'Sedang', variant: 'accent' },
    hard: { label: 'Tinggi', variant: 'warning' },
  }
  const { label, variant } = map[level] || { label: level, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}
