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
      primary: 'bg-accent text-white hover:opacity-90 shadow-sm border border-transparent',
      secondary: 'bg-surface text-ink border border-borderline hover:bg-surface/80',
      outline: 'bg-transparent text-accent border border-accent hover:bg-accent/10',
      ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-surface/60 border border-transparent',
      danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm border border-transparent',
    }[variant]

    const sizeClasses = {
      sm: 'px-2.5 py-1.5 text-xs rounded',
      md: 'px-3.5 py-2 text-sm rounded-md',
      lg: 'px-5 py-2.5 text-base rounded-md',
    }[size]

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none select-none',
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
