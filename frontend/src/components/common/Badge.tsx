import React from 'react'
import { TestCategory, DifficultyLevel } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'outline'
  size?: 'sm' | 'md'
  withDot?: boolean
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  withDot = false,
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  const variantClasses = {
    default: 'bg-surface border border-borderline text-ink',
    accent: 'bg-accent-tint border border-accent/25 text-accent font-medium',
    success: 'bg-success-subtle border border-success-border text-success font-medium',
    warning: 'bg-warning-subtle border border-warning-border text-warning font-medium',
    danger: 'bg-danger-subtle border border-danger-border text-danger font-medium',
    info: 'bg-info-subtle border border-info-border text-info font-medium',
    outline: 'border border-borderline text-ink-muted',
  }[variant]

  return (
    <span className={`inline-flex items-center rounded font-mono uppercase tracking-wider ${sizeClasses} ${variantClasses}`}>
      {withDot && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 shrink-0 opacity-80" />}
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
