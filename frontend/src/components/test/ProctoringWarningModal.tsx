import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ShieldAlert, Maximize2, AlertTriangle, ArrowRight } from 'lucide-react'

interface ProctoringWarningModalProps {
  isOpen: boolean
  violations: number
  maxViolations: number
  warningReason: string
  isFullscreen: boolean
  onDismiss: () => void
  onEnterFullscreen: () => void
}

export const ProctoringWarningModal: React.FC<ProctoringWarningModalProps> = ({
  isOpen,
  violations,
  maxViolations,
  warningReason,
  isFullscreen,
  onDismiss,
  onEnterFullscreen,
}) => {
  // Prevent background scrolling while modal is displayed
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const isExceeded = violations >= maxViolations

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="proctoring-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/70 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div className="bg-surface border border-borderline rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header with status icon & badge */}
        <div className="flex items-start space-x-3.5">
          <div
            className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
              isExceeded
                ? 'bg-danger-subtle text-danger border border-danger-border'
                : 'bg-warning-subtle text-warning border border-warning-border'
            }`}
          >
            {isExceeded ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3
                id="proctoring-modal-title"
                className="text-base font-semibold text-ink"
              >
                Peringatan Integritas Ujian
              </h3>
              <span
                className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded-full ${
                  isExceeded
                    ? 'bg-danger-subtle text-danger border border-danger-border'
                    : 'bg-warning-subtle text-warning border border-warning-border'
                }`}
              >
                {violations} / {maxViolations} Pelanggaran
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Pengawasan otomatis mendeteksi aktivitas yang berpotensi mencederai objektivitas ujian.
            </p>
          </div>
        </div>

        {/* Reason Box */}
        <div className="rounded-lg border border-borderline bg-canvas p-4 space-y-2">
          <div className="text-xs font-semibold text-ink flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span>Pemicu Peringatan:</span>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed font-sans">
            {warningReason || 'Terdeteksi meninggalkan fokus jendela ujian aktif.'}
          </p>
        </div>

        {/* Policy Notice */}
        <p className="text-[11px] text-ink-muted leading-relaxed">
          Ujian CAT dirancang untuk mensimulasikan tes resmi BKN / PTN. Mohon tetap berada di lembar soal hingga seluruh butir diselesaikan.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {isExceeded ? (
            <div className="w-full text-center py-2 px-3 rounded-lg bg-danger-subtle border border-danger-border text-xs font-semibold text-danger">
              Batas pelanggaran terlampaui. Ujian otomatis diselesaikan demi integritas tes.
            </div>
          ) : (
            <>
              {!isFullscreen && (
                <button
                  type="button"
                  onClick={() => {
                    onEnterFullscreen()
                    onDismiss()
                  }}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-lg bg-accent text-white text-xs font-semibold hover:brightness-105 btn-press focus-ring shadow-subtle transition-all cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Masuk Layar Penuh (Fokus CAT)</span>
                </button>
              )}

              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-lg border border-borderline bg-surface text-xs font-semibold text-ink hover:bg-surface-hover btn-press focus-ring transition-all cursor-pointer ${
                  !isFullscreen ? 'sm:w-auto' : 'w-full bg-accent text-white border-transparent hover:brightness-105'
                }`}
              >
                <span>{isFullscreen ? 'Paham & Lanjutkan Ujian' : 'Tetap di Mode Jendela'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
