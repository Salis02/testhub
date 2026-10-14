import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { Award, ShieldCheck, Printer, Copy, Check, X, Loader2, ExternalLink } from 'lucide-react'
import { sessionsApi } from '@/services/sessions.api'
import { useToast } from '@/context/ToastContext'
import { CertificateData } from '@/types'

interface CertificateModalProps {
  isOpen: boolean
  onClose: () => void
  resultId: string
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  resultId,
}) => {
  const toast = useToast()
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const { data: cert, isLoading, error } = useQuery<CertificateData>({
    queryKey: ['certificate', resultId],
    queryFn: ({ signal }) => sessionsApi.getCertificate(resultId, signal),
    enabled: isOpen && !!resultId,
  })

  // Generate QR Code for certificate verification
  useEffect(() => {
    if (cert?.certificate_id) {
      const verifyUrl = `${window.location.origin}/verify/certificate/${cert.certificate_id}`
      QRCode.toDataURL(verifyUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Certificate QR error:', err))
    }
  }, [cert])

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

  const handlePrint = () => {
    window.print()
  }

  const handleCopyLink = () => {
    if (!cert?.certificate_id) return
    const url = `${window.location.origin}/verify/certificate/${cert.certificate_id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Tautan Tersalin', 'Tautan verifikasi sertifikat berhasil disalin ke clipboard.')
    setTimeout(() => setCopied(false), 2500)
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200 print:p-0 print:bg-white">
      <div className="bg-surface border border-borderline rounded-lg max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-auto transition-all print:border-none print:shadow-none print:m-0 print:p-4">
        {/* Modal Controls (Hidden during print) */}
        <div className="flex items-center justify-between border-b border-borderline pb-4 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Sertifikat Kelulusan Resmi</h3>
              <p className="text-xs text-ink-muted">Terverifikasi digital dan terdaftar dalam sistem TestHub.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Canvas / Card */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-accent" />
            <p className="text-xs text-ink-muted">Membuat sertifikat kelulusan resmi...</p>
          </div>
        ) : error || !cert ? (
          <div className="py-12 text-center text-sm text-red-500">
            Gagal menerbitkan sertifikat. Pastikan Anda telah menyelesaikan ujian dan memenuhi syarat kelulusan.
          </div>
        ) : (
          <div className="relative border-4 border-double border-accent/30 dark:border-accent/40 rounded-lg p-6 sm:p-8 bg-surface text-center space-y-6 overflow-hidden shadow-inner print:border-slate-800">
            {/* Watermark / Seal Icon Background */}
            <div className="absolute right-4 bottom-4 opacity-5 pointer-events-none">
              <Award className="w-48 h-48 text-accent" />
            </div>

            {/* Header / Institution */}
            <div className="space-y-1">
              <div className="inline-flex items-center justify-center space-x-2 text-accent font-semibold text-xs tracking-widest uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>TestHub Certification Authority</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                SERTIFIKAT KELULUSAN
              </h1>
              <p className="text-xs text-ink-muted font-mono">
                Nomor: <span className="text-ink font-semibold">{cert.certificate_id}</span>
              </p>
            </div>

            {/* Body Text */}
            <div className="space-y-2 py-2">
              <p className="text-xs text-ink-muted uppercase tracking-wider">Diberikan Sebagai Bukti Kelulusan Asesmen</p>
              <h2 className="text-xl sm:text-2xl font-semibold text-accent">
                {cert.test_title}
              </h2>
              <div className="inline-block px-3 py-1 rounded bg-accent/10 border border-accent/20 text-accent text-xs font-medium uppercase tracking-wide">
                Kategori: {cert.category.toUpperCase()}
              </div>
            </div>

            {/* Score & Evaluation */}
            <div className="bg-canvas border border-borderline rounded-md p-4 max-w-sm mx-auto flex items-center justify-around text-center">
              <div>
                <p className="text-[11px] text-ink-muted uppercase">Skor Pencapaian</p>
                <p className="text-2xl font-bold font-mono text-accent tabular-nums">
                  {cert.percentage_score.toFixed(1)}%
                </p>
              </div>
              <div className="h-8 w-px bg-borderline" />
              <div>
                <p className="text-[11px] text-ink-muted uppercase">Standar Kelulusan</p>
                <p className="text-sm font-semibold font-mono text-ink tabular-nums">
                  Min. {cert.passing_score_percentage}%
                </p>
                <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  LULUS RESMI
                </span>
              </div>
            </div>

            {/* Signatures & QR Code */}
            <div className="pt-4 border-t border-borderline/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
              <div className="space-y-1 text-xs">
                <p className="text-ink-muted">Diterbitkan pada:</p>
                <p className="font-medium text-ink">
                  {new Date(cert.issued_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-[11px] text-ink-muted pt-1">
                  Penerbit: <strong className="text-ink">{cert.issuer}</strong>
                </p>
              </div>

              {qrDataUrl && (
                <div className="flex items-center space-x-3 bg-surface p-2 rounded border border-borderline">
                  <img
                    src={qrDataUrl}
                    alt="Certificate QR Verification"
                    className="w-16 h-16 rounded"
                  />
                  <div className="text-[10px] text-ink-muted max-w-[120px] leading-tight">
                    <p className="font-semibold text-ink">Pindai QR</p>
                    <p>Untuk verifikasi keaslian publik secara instan.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls (Hidden during print) */}
        {cert && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-borderline print:hidden">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-ink bg-surface hover:bg-surface-hover border border-borderline rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tautan Disalin!' : 'Salin Tautan Publik'}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:opacity-90 rounded-md shadow-sm transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / Simpan PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-ink bg-surface hover:bg-surface-hover border border-borderline rounded-md transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
