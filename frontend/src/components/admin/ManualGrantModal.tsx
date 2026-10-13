import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ManualGrantSchema, ManualGrantFormValues } from '@/schemas/subscription.schema'
import { Test } from '@/types'
import { X, ShieldCheck, Loader2 } from 'lucide-react'

interface ManualGrantModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (values: ManualGrantFormValues) => Promise<void>
  tests: Test[]
  isLoadingTests?: boolean
}

const DEFAULT_VALUES: ManualGrantFormValues = {
  user_identifier: '',
  plan_type: 'season_pass',
  test_id: null,
  valid_days: 90,
  reason_notes: '',
}

export const ManualGrantModal: React.FC<ManualGrantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  tests,
  isLoadingTests = false,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualGrantFormValues>({
    resolver: zodResolver(ManualGrantSchema) as any,
    defaultValues: DEFAULT_VALUES,
    mode: 'onTouched',
  })

  const selectedPlanType = watch('plan_type')

  useEffect(() => {
    if (isOpen) {
      reset(DEFAULT_VALUES)
    }
  }, [isOpen, reset])

  if (!isOpen) return null

  const handleFormSubmit = async (values: ManualGrantFormValues) => {
    await onSubmit(values)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 dark:bg-black/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Beri Akses Manual (Admin Override)</h3>
              <p className="text-xs text-ink-muted">Bypass paywall untuk transaksi B2B, transfer bank, atau voucher khusus.</p>
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
          {/* User Email */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Email Pengguna / Peserta *
            </label>
            <input
              type="email"
              {...register('user_identifier')}
              placeholder="contoh: peserta@institusi.ac.id"
              className={`w-full px-3 py-2 text-sm rounded-md border bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent ${
                errors.user_identifier ? 'border-red-500' : 'border-borderline'
              }`}
            />
            {errors.user_identifier && (
              <p className="text-xs text-red-500 mt-1">{errors.user_identifier.message}</p>
            )}
          </div>

          {/* Plan Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Pilihan Paket Langganan *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setValue('plan_type', 'season_pass', { shouldValidate: true })
                  setValue('valid_days', 90)
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedPlanType === 'season_pass'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-borderline bg-canvas hover:bg-surface-hover'
                }`}
              >
                <div className="text-xs font-semibold text-ink">Season Pass All-Access</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Seluruh tryout (90 hari)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setValue('plan_type', 'per_test', { shouldValidate: true })
                  setValue('valid_days', 30)
                }}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedPlanType === 'per_test'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-borderline bg-canvas hover:bg-surface-hover'
                }`}
              >
                <div className="text-xs font-semibold text-ink">Per-Modul Tertentu</div>
                <div className="text-[11px] text-ink-muted mt-0.5">Akses 1 modul tryout</div>
              </button>
            </div>
          </div>

          {/* Test Selector (Conditional) */}
          {selectedPlanType === 'per_test' && (
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Pilih Modul Ujian Target *
              </label>
              {isLoadingTests ? (
                <div className="flex items-center space-x-2 text-xs text-ink-muted py-2 font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                  <span>Memuat modul ujian...</span>
                </div>
              ) : (
                <select
                  {...register('test_id')}
                  className={`w-full px-3 py-2 text-sm rounded-md border bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono ${
                    errors.test_id ? 'border-red-500' : 'border-borderline'
                  }`}
                >
                  <option value="">-- Pilih Modul Ujian --</option>
                  {tests.map((t) => (
                    <option key={t.id} value={t.id}>
                      [{t.category.toUpperCase()}] {t.title}
                    </option>
                  ))}
                </select>
              )}
              {errors.test_id && (
                <p className="text-xs text-red-500 mt-1">{errors.test_id.message}</p>
              )}
            </div>
          )}

          {/* Valid Days */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Masa Aktif Akses (Hari) *
            </label>
            <input
              type="number"
              min={1}
              max={365}
              {...register('valid_days', { valueAsNumber: true })}
              className={`w-full px-3 py-2 text-sm rounded-md border bg-canvas text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent ${
                errors.valid_days ? 'border-red-500' : 'border-borderline'
              }`}
            />
            {errors.valid_days && (
              <p className="text-xs text-red-500 mt-1">{errors.valid_days.message}</p>
            )}
          </div>

          {/* Reason Notes */}
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Catatan Alasan Audit *
            </label>
            <textarea
              rows={3}
              {...register('reason_notes')}
              placeholder="Contoh: MoU B2B Dinas Pendidikan, bukti transfer BCA rek 9812xxx, atau kompensasi gangguan server."
              className={`w-full px-3 py-2 text-sm rounded-md border bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent ${
                errors.reason_notes ? 'border-red-500' : 'border-borderline'
              }`}
            />
            {errors.reason_notes && (
              <p className="text-xs text-red-500 mt-1">{errors.reason_notes.message}</p>
            )}
          </div>

          {/* Actions */}
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
              className="px-5 py-2 text-xs font-semibold rounded-md bg-accent text-white hover:opacity-95 shadow-xs transition-opacity disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Aktifkan Hak Akses</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
