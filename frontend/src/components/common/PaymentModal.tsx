import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { paymentsApi } from '@/services/payments.api'
import { PaymentInvoiceResponse, SubscriptionTier } from '@/types'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { setStoredUserEmail } from '@/services/client'
import {
  X,
  CreditCard,
  QrCode,
  Clock,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  testId: string
  testTitle: string
  priceIdr: number
  onPaymentSuccess: (email?: string) => void
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  testId,
  testTitle,
  priceIdr,
  onPaymentSuccess,
}) => {
  const { user } = useAuth()
  const toast = useToast()

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('per_test')
  const [email, setEmail] = useState<string>(user?.email || '')
  const [invoice, setInvoice] = useState<PaymentInvoiceResponse | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState<number>(900)
  const hasHandledSettlementRef = useRef(false)

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      if (user?.email) setEmail(user.email)
      setInvoice(null)
      setQrDataUrl('')
      setSecondsLeft(900)
      hasHandledSettlementRef.current = false
    }
  }, [isOpen, user])

  // Generate QR Code data URL when invoice is created
  useEffect(() => {
    if (invoice?.qr_payload) {
      QRCode.toDataURL(invoice.qr_payload, {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code generation error:', err))
    }
  }, [invoice])

  // Polling order status via TanStack Query (Clean SOP: refetchInterval stops on settled/expired)
  const { data: orderStatus } = useQuery({
    queryKey: ['order-status', invoice?.order_id],
    queryFn: ({ signal }) => paymentsApi.getOrderStatus(invoice!.order_id, signal),
    enabled: isOpen && !!invoice?.order_id,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'settled' || status === 'expired') return false
      return 3000
    },
  })

  // Handle successful settlement (guaranteed exactly once per transaction)
  useEffect(() => {
    if (orderStatus?.status === 'settled' && !hasHandledSettlementRef.current) {
      hasHandledSettlementRef.current = true
      const cleanEmail = email.trim()
      setStoredUserEmail(cleanEmail)
      toast.success(
        'Pembayaran Berhasil Diverifikasi',
        'Hak akses ujian Anda telah aktif. Mengalihkan ke ruang tes...'
      )
      const timer = setTimeout(() => {
        onPaymentSuccess(cleanEmail)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [orderStatus?.status, onPaymentSuccess, toast, email])

  // Countdown timer for invoice expiration (15 minutes)
  useEffect(() => {
    if (!invoice || orderStatus?.status === 'settled') return

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [invoice, orderStatus])

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`
  }

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      toast.warning('Email Diperlukan', 'Masukkan alamat email valid untuk menerima bukti invoice.')
      return
    }

    try {
      setIsCreatingInvoice(true)
      const cleanEmail = email.trim()
      setStoredUserEmail(cleanEmail)
      const inv = await paymentsApi.createInvoice({
        plan_type: selectedPlan,
        test_id: selectedPlan === 'per_test' ? testId : null,
        user_email: cleanEmail,
      })
      setInvoice(inv)
      setSecondsLeft(inv.countdown_second || 900)
      toast.info('Invoice Dibuat', 'Silakan pindai kode QRIS atau bayar via Midtrans Snap.')
    } catch (err) {
      toast.error('Gagal Membuat Tagihan', (err as Error).message)
    } finally {
      setIsCreatingInvoice(false)
    }
  }

  const handleOpenSnap = () => {
    if (!invoice) return

    // If Midtrans Snap is injected globally on window
    const snap = (window as unknown as { snap?: { pay: (token: string, options?: unknown) => void } }).snap
    if (snap && invoice.snap_token) {
      snap.pay(invoice.snap_token, {
        onSuccess: () => {
          toast.success('Pembayaran Berhasil', 'Memverifikasi status...')
        },
        onPending: () => {
          toast.info('Menunggu Pembayaran', 'Silakan selesaikan pembayaran.')
        },
        onError: () => {
          toast.error('Gagal', 'Pembayaran tidak dapat diselesaikan.')
        },
        onClose: () => {
          // examinee closed snap popup
        },
      })
    } else if (invoice.redirect_url) {
      window.open(invoice.redirect_url, '_blank', 'noopener,noreferrer')
    }
  }

  const isSettled = orderStatus?.status === 'settled'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 dark:bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-6 my-auto transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Buka Akses Modul Ujian</h3>
              <p className="text-xs text-ink-muted">Pembayaran instan QRIS & e-Wallet otomatis aktif.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSettled ? (
          /* Settlement Success View */
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-ink">Pembayaran Berhasil!</h4>
              <p className="text-xs text-ink-muted">
                Hak akses tryout telah aktif. Anda dialihkan langsung ke ruang ujian...
              </p>
            </div>
          </div>
        ) : !invoice ? (
          /* Step 1: Choose Plan and Input Email */
          <form onSubmit={handleCreateInvoice} className="space-y-5">
            <div className="p-3.5 rounded-lg border border-borderline bg-canvas/60 space-y-1.5">
              <span className="text-[11px] font-mono text-ink-muted uppercase tracking-wider block">
                Modul Target:
              </span>
              <h4 className="text-sm font-semibold text-ink leading-snug">{testTitle}</h4>
            </div>

            {/* Plan Options */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Pilih Paket Akses:
              </label>

              {/* Per Test */}
              <div
                onClick={() => setSelectedPlan('per_test')}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                  selectedPlan === 'per_test'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-borderline bg-canvas hover:bg-surface-hover'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-ink">Akses Modul Ini Saja</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    1x Modul ujian lengkap + pembahasan & analitik
                  </div>
                </div>
                <div className="text-sm font-bold text-ink font-mono">
                  {formatRupiah(priceIdr > 0 ? priceIdr : 15000)}
                </div>
              </div>

              {/* Season Pass */}
              <div
                onClick={() => setSelectedPlan('season_pass')}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between relative overflow-hidden ${
                  selectedPlan === 'season_pass'
                    ? 'border-accent bg-accent/5 ring-1 ring-accent'
                    : 'border-borderline bg-canvas hover:bg-surface-hover'
                }`}
              >
                <div className="absolute top-0 right-0 bg-accent text-white text-[9px] font-bold px-2 py-0.5 rounded-bl uppercase tracking-wider">
                  Rekomendasi
                </div>
                <div>
                  <div className="text-xs font-semibold text-ink flex items-center space-x-1.5">
                    <span>Season Pass All-Access (90 Hari)</span>
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    Akses seluruh bank soal CPNS, UTBK, BUMN tanpa batas
                  </div>
                </div>
                <div className="text-sm font-bold text-accent font-mono">Rp 79.000</div>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Email Peserta (Untuk Penerbitan Lisensi) *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full px-3 py-2 text-xs rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <p className="text-[11px] text-ink-muted mt-1">
                Sistem akan mengaitkan lisensi akses ke email ini.
              </p>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-borderline">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-md border border-borderline bg-canvas text-ink hover:bg-surface-hover transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreatingInvoice}
                className="px-5 py-2 text-xs font-semibold rounded-md bg-accent text-white hover:opacity-95 shadow-xs transition-opacity flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isCreatingInvoice ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyiapkan Invoice...</span>
                  </>
                ) : (
                  <span>Lanjut Pembayaran QRIS</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2: Invoice QRIS & Midtrans Snap View */
          <div className="space-y-5 text-center">
            {/* Amount & Timer Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-borderline bg-canvas/80 text-xs font-mono">
              <div className="text-left">
                <span className="text-[10px] text-ink-muted block uppercase">Total Tagihan:</span>
                <span className="text-sm font-bold text-ink">{formatRupiah(invoice.amount)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-ink-muted block uppercase flex items-center space-x-1 justify-end">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span>Sisa Waktu:</span>
                </span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  {formatTimer(secondsLeft)}
                </span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="p-5 rounded-lg border border-borderline bg-white max-w-[280px] mx-auto shadow-sm space-y-3">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QRIS Payment Code"
                  className="w-full aspect-square object-contain mx-auto"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                  <QrCode className="w-12 h-12 animate-pulse" />
                </div>
              )}
              <div className="text-[11px] font-mono text-slate-700 font-semibold uppercase tracking-wider">
                Pindai dengan BCA / Mandiri / GoPay / OVO / DANA
              </div>
            </div>

            {/* Polling Indicator */}
            <div className="flex items-center justify-center space-x-2 text-xs text-ink-muted font-mono">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              <span>Menunggu konfirmasi pembayaran otomatis...</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {invoice.snap_token && (
                <button
                  type="button"
                  onClick={handleOpenSnap}
                  className="w-full py-2.5 px-4 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity flex items-center justify-center space-x-2"
                >
                  <span>Bayar via Midtrans Snap (Popup / E-Wallet)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setInvoice(null)}
                className="text-xs text-ink-muted hover:text-ink underline block mx-auto pt-1"
              >
                Ganti Paket atau Ubah Email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
