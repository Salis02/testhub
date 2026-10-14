import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ExtendSubscriptionSchema, ExtendSubscriptionFormValues } from '@/schemas/subscription.schema'
import { Subscription } from '@/types'
import { X, CalendarPlus, Loader2 } from 'lucide-react'

interface ExtendSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  subscription: Subscription | null
  onSubmit: (extendDays: number, notes: string) => Promise<void>
}

export const ExtendSubscriptionModal: React.FC<ExtendSubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExtendSubscriptionFormValues>({
    resolver: zodResolver(ExtendSubscriptionSchema) as any,
    defaultValues: {
      extend_days: 30,
      admin_notes: '',
    },
  })

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen || !subscription) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, subscription])

  if (!isOpen || !subscription) return null

  const handleFormSubmit = async (values: ExtendSubscriptionFormValues) => {
    await onSubmit(values.extend_days, values.admin_notes || '')
    reset()
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 dark:bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-md w-full p-6 shadow-2xl space-y-5 my-auto">
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <CalendarPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Perpanjang Masa Aktif</h3>
              <p className="text-xs text-ink-muted font-mono">{subscription.user_identifier}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Tambahan Hari *
            </label>
            <input
              type="number"
              min={1}
              max={365}
              {...register('extend_days', { valueAsNumber: true })}
              className={`w-full px-3 py-2 text-sm rounded-md border bg-canvas text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent ${
                errors.extend_days ? 'border-red-500' : 'border-borderline'
              }`}
            />
            {errors.extend_days && (
              <p className="text-xs text-red-500 mt-1">{errors.extend_days.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Catatan Admin (Opsional)
            </label>
            <input
              type="text"
              {...register('admin_notes')}
              placeholder="Contoh: Perpanjangan kompensasi 30 hari"
              className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-borderline">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-md border border-borderline bg-canvas text-ink hover:bg-surface-hover transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-md bg-accent text-white hover:opacity-95 shadow-xs transition-opacity flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perpanjangan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
