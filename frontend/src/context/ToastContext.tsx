import React, { createContext, useContext, useState, useCallback, useMemo, useId } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  isExiting?: boolean
}

interface ToastContextValue {
  toast: {
    success: (title: string, description?: string, duration?: number) => void
    error: (title: string, description?: string, duration?: number) => void
    warning: (title: string, description?: string, duration?: number) => void
    info: (title: string, description?: string, duration?: number) => void
    dismiss: (id: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 320)
  }, [])

  const addToast = useCallback(
    (type: ToastType, title: string, description?: string, duration = 4000) => {
      const id = 'toast-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now()
      const newToast: ToastItem = { id, type, title, description, duration }

      setToasts((prev) => [newToast, ...prev].slice(0, 5)) // Max 5 toasts visible

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id)
        }, duration)
      }
    },
    [dismiss]
  )

  const toastMethods = useMemo(
    () => ({
      success: (title: string, description?: string, duration?: number) =>
        addToast('success', title, description, duration),
      error: (title: string, description?: string, duration?: number) =>
        addToast('error', title, description, duration),
      warning: (title: string, description?: string, duration?: number) =>
        addToast('warning', title, description, duration),
      info: (title: string, description?: string, duration?: number) =>
        addToast('info', title, description, duration),
      dismiss,
    }),
    [addToast, dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast: toastMethods }}>
      {children}
      {/* Toast Floating Container */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[9999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false)

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const getIconAndStyle = () => {
    switch (item.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
          border: 'border-emerald-500/30',
        }
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
          border: 'border-red-500/30',
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
          border: 'border-amber-500/30',
        }
      case 'info':
      default:
        return {
          icon: <Info className="w-4 h-4 text-accent shrink-0" />,
          border: 'border-accent/30',
        }
    }
  }

  const { icon, border } = getIconAndStyle()

  // Transition state calculations
  const isVisible = mounted && !item.isExiting

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-lg bg-surface/95 backdrop-blur-md border ${border} shadow-xl shadow-ink/5 dark:shadow-black/25 text-ink transition-all duration-300 ease-out transform ${
        isVisible
          ? 'opacity-100 translate-y-0 translate-x-0 scale-100'
          : item.isExiting
            ? 'opacity-0 translate-x-10 scale-95 pointer-events-none'
            : 'opacity-0 -translate-y-3 scale-95'
      }`}
    >
      <div className="pt-0.5">{icon}</div>
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-xs font-semibold leading-tight text-ink">{item.title}</p>
        {item.description && (
          <p className="text-[11px] text-ink-muted mt-1 leading-relaxed break-words">
            {item.description}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Tutup notifikasi"
        className="text-ink-muted hover:text-ink p-1 rounded hover:bg-borderline/40 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx.toast
}
