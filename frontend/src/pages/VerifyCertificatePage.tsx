import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, AlertCircle, Award, CheckCircle2, Calendar, FileText, ArrowLeft, Loader2, Share2 } from 'lucide-react'
import { sessionsApi } from '@/services/sessions.api'
import { CertificateData } from '@/types'

export const VerifyCertificatePage: React.FC = () => {
  const { certificateId } = useParams<{ certificateId: string }>()

  const { data: cert, isLoading, error } = useQuery<CertificateData>({
    queryKey: ['verify-certificate', certificateId],
    queryFn: ({ signal }) => sessionsApi.verifyCertificate(certificateId!, signal),
    enabled: !!certificateId,
    retry: false,
  })

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16 space-y-8 animate-in fade-in duration-300">
      {/* Back button */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Ujian</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="bg-surface border border-borderline rounded-lg p-12 text-center space-y-4 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-ink">Memverifikasi Keaslian Sertifikat...</h3>
            <p className="text-xs text-ink-muted">Memeriksa tanda tangan digital di database TestHub Certification Authority.</p>
          </div>
        </div>
      ) : error || !cert || cert.valid === false ? (
        <div className="bg-surface border border-red-500/20 rounded-lg p-8 sm:p-10 text-center space-y-5 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-ink">Sertifikat Tidak Ditemukan</h2>
            <p className="text-sm text-ink-muted max-w-md mx-auto">
              ID Sertifikat <strong className="font-mono text-ink">{certificateId}</strong> tidak terdaftar dalam basis data resmi TestHub atau telah dibatalkan.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
            >
              Jelajahi Modul Resmi TestHub
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-borderline rounded-lg p-6 sm:p-8 space-y-6 shadow-sm">
          {/* Verification Badge */}
          <div className="flex items-center justify-between pb-6 border-b border-borderline">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>TERVERIFIKASI ASLI</span>
                </div>
                <h2 className="text-lg font-bold text-ink mt-0.5">Sertifikat Resmi Terdaftar</h2>
              </div>
            </div>
          </div>

          {/* Certificate Metadata */}
          <div className="space-y-4">
            <div className="p-4 rounded-md bg-canvas border border-borderline/80 space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-ink-muted font-medium">Modul Ujian</span>
              <h3 className="text-xl font-semibold text-accent">{cert.test_title}</h3>
              <p className="text-xs text-ink-muted">Kategori: <strong className="text-ink">{cert.category.toUpperCase()}</strong></p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-md bg-surface border border-borderline space-y-1">
                <span className="text-[11px] text-ink-muted uppercase">Nomor Sertifikat</span>
                <p className="font-mono text-xs font-semibold text-ink">{cert.certificate_id}</p>
              </div>

              <div className="p-3.5 rounded-md bg-surface border border-borderline space-y-1">
                <span className="text-[11px] text-ink-muted uppercase">Skor Kelulusan</span>
                <p className="font-mono text-base font-bold text-accent tabular-nums">
                  {cert.percentage_score.toFixed(1)}% <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 font-sans ml-1">(Lulus)</span>
                </p>
              </div>

              <div className="p-3.5 rounded-md bg-surface border border-borderline space-y-1">
                <span className="text-[11px] text-ink-muted uppercase">Tanggal Terbit</span>
                <p className="text-xs font-medium text-ink">
                  {new Date(cert.issued_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="p-3.5 rounded-md bg-surface border border-borderline space-y-1">
                <span className="text-[11px] text-ink-muted uppercase">Lembaga Penerbit</span>
                <p className="text-xs font-medium text-ink">{cert.issuer}</p>
              </div>
            </div>
          </div>

          {/* Security statement footer */}
          <div className="pt-4 border-t border-borderline flex flex-col sm:flex-row items-center justify-between text-xs text-ink-muted gap-3">
            <p className="text-[11px]">
              Diterbitkan secara elektronik oleh platform TestHub dengan enkripsi integritas data.
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-surface hover:bg-surface-hover border border-borderline text-ink transition-colors flex-shrink-0"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan Tautan</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
