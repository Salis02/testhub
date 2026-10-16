import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
  className?: string
  showCloseButton?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
  className,
  showCloseButton = true,
}) => {
  const [isRendered, setIsRendered] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Smooth enter & exit transition state
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true)
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
      return () => cancelAnimationFrame(frame)
    } else {
      setIsVisible(false)
      const timer = setTimeout(() => {
        setIsRendered(false)
      }, 220)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // ESC key listener & body scroll lock
  useEffect(() => {
    if (!isRendered) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isRendered, onClose])

  if (!isRendered) return null

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  }[maxWidth]

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-ink/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Window */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full rounded-lg bg-surface border border-borderline shadow-2xl z-10 my-8 overflow-hidden transform transition-all duration-200 ease-out',
          maxWidthClasses,
          isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-3 pointer-events-none',
          className
        )}
      >
        {/* Header (if title or close button provided) */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-5 border-b border-borderline">
            <div>
              {typeof title === 'string' ? (
                <h3 className="text-lg font-semibold text-ink">{title}</h3>
              ) : (
                title
              )}
              {description && <p className="text-xs text-ink-muted mt-0.5">{description}</p>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup Modal"
                className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-surface/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
