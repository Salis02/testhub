import React from 'react'
import { FolderOpen } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-borderline bg-surface/40',
        className
      )}
    >
      <div className="p-3 rounded-full bg-accent/10 text-accent mb-3.5 flex items-center justify-center">
        {icon || <FolderOpen className="w-6 h-6" />}
      </div>
      <h3 className="text-base font-semibold text-ink mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-muted max-w-sm mb-5">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:opacity-90 shadow-sm transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
