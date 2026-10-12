import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react'
import { AlertTriangle, HelpCircle, Info, ShieldAlert, X } from 'lucide-react'

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'primary'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
  }>({
    isOpen: false,
    options: { title: '', message: '' },
  })

  const resolverRef = useRef<((value: boolean) => void) | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setDialogState({
        isOpen: true,
        options: {
          confirmText: 'Lanjutkan',
          cancelText: 'Batal',
          variant: 'primary',
          ...options,
        },
      })
    })
  }, [])

  const handleClose = useCallback((result: boolean) => {
    setDialogState((prev) => ({ ...prev, isOpen: false }))
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
  }, [])

  // Keyboard navigation (ESC to cancel, Enter to confirm)
  useEffect(() => {
    if (!dialogState.isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    // Auto-focus confirm or cancel button
    setTimeout(() => {
      confirmButtonRef.current?.focus()
    }, 50)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialogState.isOpen, handleClose])

  const getVariantStyles = (variant: ConfirmVariant = 'primary') => {
    switch (variant) {
      case 'danger':
        return {
          icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
          buttonClass: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
          borderClass: 'border-red-500/30',
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
          buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
          borderClass: 'border-amber-500/30',
        }
      case 'info':
        return {
          icon: <Info className="w-5 h-5 text-accent" />,
          buttonClass: 'bg-accent hover:opacity-90 text-white shadow-sm',
          borderClass: 'border-accent/30',
        }
      case 'primary':
      default:
        return {
          icon: <HelpCircle className="w-5 h-5 text-accent" />,
          buttonClass: 'bg-accent hover:opacity-90 text-white shadow-sm',
          borderClass: 'border-borderline',
        }
    }
  }

  const { options } = dialogState
  const variantStyles = getVariantStyles(options.variant)

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {dialogState.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-ink/50 dark:bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            className={`w-full max-w-md rounded-xl bg-surface border ${variantStyles.borderClass} shadow-2xl p-6 space-y-4 text-ink animate-in zoom-in-95 duration-200`}
          >
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-lg bg-canvas border border-borderline shrink-0">
                {variantStyles.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-ink leading-tight">
                  {options.title}
                </h3>
                <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                  {options.message}
                </p>
              </div>
              <button
                onClick={() => handleClose(false)}
                className="text-ink-muted hover:text-ink p-1 rounded-md hover:bg-borderline/40 transition-colors"
                aria-label="Tutup dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-borderline">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-4 py-2 rounded-md border border-borderline text-xs font-medium text-ink hover:bg-canvas transition-colors"
              >
                {options.cancelText || 'Batal'}
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => handleClose(true)}
                className={`px-4 py-2 rounded-md text-xs font-medium transition-colors ${variantStyles.buttonClass}`}
              >
                {options.confirmText || 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return ctx
}
