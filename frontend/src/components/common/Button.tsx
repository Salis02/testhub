import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      primary: 'bg-accent text-white hover:brightness-105 active:brightness-95 shadow-subtle border border-transparent focus-visible:ring-accent',
      secondary: 'bg-surface text-ink border border-borderline hover:bg-surface-hover hover:border-ink/20 shadow-subtle focus-visible:ring-ink-muted',
      outline: 'bg-transparent text-accent border border-accent/40 hover:bg-accent-tint hover:border-accent focus-visible:ring-accent',
      ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-surface-hover border border-transparent focus-visible:ring-ink-muted',
      danger: 'bg-danger text-white hover:brightness-105 active:brightness-95 shadow-subtle border border-transparent focus-visible:ring-danger',
    }[variant]

    const sizeClasses = {
      sm: 'px-2.5 py-1.5 text-xs rounded gap-1.5',
      md: 'px-3.5 py-2 text-sm rounded-md gap-2',
      lg: 'px-5 py-2.5 text-base rounded-md gap-2.5',
    }[size]

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium btn-press focus-ring disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer',
          variantClasses,
          sizeClasses,
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="mr-2 shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="ml-2 shrink-0">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
