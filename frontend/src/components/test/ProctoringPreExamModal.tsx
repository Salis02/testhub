import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ShieldCheck, Maximize2, Eye, Lock, ArrowRight, AlertCircle } from 'lucide-react'

interface ProctoringPreExamModalProps {
  isOpen: boolean
  requireFullscreen: boolean
  detectTabSwitch: boolean
  blockCopyPaste: boolean
  maxViolations: number
  testTitle: string
  onConfirmAndStart: () => void
}

export const ProctoringPreExamModal: React.FC<ProctoringPreExamModalProps> = ({
  isOpen,
  requireFullscreen,
  detectTabSwitch,
  blockCopyPaste,
  maxViolations,
  testTitle,
  onConfirmAndStart,
}) => {
  // Lock body scroll while modal is active
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-ink/75 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div className="bg-surface border border-borderline rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header with Shield Icon */}
        <div className="flex items-start space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-accent/10 border border-accent/20 text-accent flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-base sm:text-lg font-semibold text-ink">
                Protokol Integritas Ujian
              </h3>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-accent-tint text-accent border border-accent/20 font-semibold uppercase">
                Pra-Ujian
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Modul <strong className="text-ink font-semibold">"{testTitle}"</strong> dilengkapi protokol integritas terstandar untuk menjamin keakuratan peringkat persentil nasional Anda.
            </p>
          </div>
        </div>

        {/* Active Rules Checklist */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-ink uppercase tracking-wider">
            Aturan Pengawasan yang Diberlakukan:
          </p>

          <div className="space-y-2">
            {requireFullscreen && (
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-borderline bg-canvas">
                <div className="p-1.5 rounded-md bg-accent/10 text-accent shrink-0 mt-0.5">
                  <Maximize2 className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-ink block">Mode Layar Penuh Wajib</span>
                  <span className="text-ink-muted">
                    Simulasi berjalan dalam layar penuh (standar CAT BKN/PTN resmi). Keluar dari layar penuh akan dicatat sistem.
                  </span>
                </div>
              </div>
            )}

            {detectTabSwitch && (
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-borderline bg-canvas">
                <div className="p-1.5 rounded-md bg-warning-subtle text-warning shrink-0 mt-0.5">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-ink block">
                    Pemantauan Tab & Jendela (Toleransi {maxViolations}x)
                  </span>
                  <span className="text-ink-muted">
                    Sistem mendeteksi jika Anda berpindah tab peramban atau membuka aplikasi lain saat ujian berlangsung.
                  </span>
                </div>
              </div>
            )}

            {blockCopyPaste && (
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-borderline bg-canvas">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-ink block">Proteksi Butir Soal (Anti-Copy)</span>
                  <span className="text-ink-muted">
                    Fitur salin teks, pintasan keyboard, dan klik kanan dinonaktifkan demi kerahasiaan lembar soal.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reassurance Callout */}
        <div className="p-3 rounded-lg border border-borderline bg-surface flex items-start space-x-2 text-[11px] text-ink-muted">
          <AlertCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Tidak perlu khawatir! Peringatan hanya dicatat jika Anda meninggalkan halaman ujian. Pastikan Anda menutup aplikasi lain sebelum memulai.
          </p>
        </div>

        {/* Affirmative CTA Button */}
        <button
          type="button"
          onClick={onConfirmAndStart}
          className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-accent text-white text-xs sm:text-sm font-semibold hover:brightness-105 btn-press focus-ring shadow-subtle transition-all cursor-pointer"
        >
          <span>Saya Paham & Siap Mulai Ujian</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body
  )
}
