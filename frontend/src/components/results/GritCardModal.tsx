import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import QRCode from 'qrcode'
import { Sparkles, Download, Copy, Check, X, Loader2, Heart, Award, TrendingUp, Clock, Flame } from 'lucide-react'
import { useToast } from '@/context/ToastContext'
import { TestResult } from '@/types'

interface GritCardModalProps {
  isOpen: boolean
  onClose: () => void
  result: TestResult
}

const INSPIRATIONAL_QUOTES = [
  'Setiap butir soal yang kupelajari adalah doa dan ikhtiar untuk masa depan. Langkahku tak akan terhenti.',
  'Untuk Bapak & Ibu di rumah: lelah hari ini adalah persiapan untuk senyum bahagia kalian nanti.',
  'Bukan tentang seberapa cepat kita sampai, tapi seberapa teguh kita bangkit di setiap evaluasi.',
  'Satu persen lebih siap hari ini. NIP dan masa depan impian sudah di depan mata.',
]

export const GritCardModal: React.FC<GritCardModalProps> = ({ isOpen, onClose, result }) => {
  const toast = useToast()
  const cardRef = useRef<HTMLDivElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [selectedQuoteIdx, setSelectedQuoteIdx] = useState(0)
  const [customDedication, setCustomDedication] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate verification QR code
  useEffect(() => {
    if (result.id) {
      const verifyUrl = `${window.location.origin}/results/${result.id}`
      QRCode.toDataURL(verifyUrl, {
        width: 110,
        margin: 1,
        color: {
          dark: '#F1F5F9',
          light: '#0B0F17',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation error:', err))
    }
  }, [result])

  // Prevent background scrolling
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) return null

  const activeQuote = customDedication.trim() || INSPIRATIONAL_QUOTES[selectedQuoteIdx]

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s}s`
  }

  const handleDownloadStoryImage = async () => {
    if (!cardRef.current) return
    setIsExporting(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // Ultra-crisp for mobile screens (Retina)
        useCORS: true,
        logging: false,
        backgroundColor: '#0B0F17',
      })

      const link = document.createElement('a')
      link.download = `Kartu-Perjuangan-${result.test_title.replace(/\s+/g, '-').substring(0, 20)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast.success(
        'Kartu Perjuangan Siap Dibagikan!',
        'Gambar resolusi tinggi format 9:16 tersimpan di galeri perangkat Anda.'
      )
    } catch (err) {
      console.error('Failed to export story card:', err)
      toast.error('Gagal Menyimpan Kartu', 'Terjadi kesalahan saat memproses gambar story.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyCaption = () => {
    const caption = `🔥 Catatan Perjuangan Hari Ini (${result.test_title})\n` +
      `🎯 Akurasi: ${result.questions_correct}/${result.total_questions} Soal Ditaklukkan\n` +
      `⏱️ Waktu Latihan: ${formatSeconds(result.time_spent_seconds)}\n` +
      `📈 Peringkat: Top ${100 - result.percentile}% Nasional\n\n` +
      `"${activeQuote}"\n\n` +
      `Pantang menyerah sebelum SK dan NIP di tangan! 💪\n` +
      `#PejuangCPNS #AmbisUTBK #TestHub #KawanSeperjuangan`

    navigator.clipboard.writeText(caption)
    setCopied(true)
    toast.success('Caption Tersalin!', 'Teks caption siap dipaste ke Instagram Story, X, atau WhatsApp.')
    setTimeout(() => setCopied(false), 2500)
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-ink/75 dark:bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-xl max-w-xl w-full p-5 sm:p-7 shadow-2xl space-y-6 my-auto transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Kartu Perjuangan (Story 9:16)</h3>
              <p className="text-xs text-ink-muted">Bukti konsistensi dan ikhtiar untuk dibagikan ke media sosial.</p>
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

        {/* 9:16 Card Preview Container */}
        <div className="flex justify-center">
          <div
            ref={cardRef}
            className="w-[310px] sm:w-[330px] aspect-[9/16] bg-[#0B0F17] text-[#F1F5F9] rounded-2xl p-6 flex flex-col justify-between border border-blue-500/30 shadow-2xl relative overflow-hidden select-none"
            style={{
              boxShadow: '0 20px 45px -15px rgba(29, 78, 216, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Top Glow & Subtle Ambient Ring */}
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Branding Strip */}
            <div className="space-y-2 relative z-10">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                    🎯
                  </div>
                  <span className="text-xs font-semibold tracking-wider uppercase text-blue-400">
                    TestHub
                  </span>
                </div>
                <span className="text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/70">
                  {result.category.toUpperCase()}
                </span>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-mono uppercase text-white/50 tracking-wider block">
                  Simulasi CAT Nasional
                </span>
                <h4 className="text-sm font-semibold text-white/95 line-clamp-2 leading-snug">
                  {result.test_title}
                </h4>
              </div>
            </div>

            {/* Center: Core Achievement & Metric */}
            <div className="space-y-4 my-auto py-2 relative z-10">
              {/* Highlight Badge */}
              <div className="bg-gradient-to-r from-blue-950/70 to-slate-900 border border-blue-500/30 rounded-xl p-4 text-center space-y-1">
                <div className="inline-flex items-center space-x-1.5 text-amber-400 text-[11px] font-mono uppercase tracking-wider">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Peringkat Persentil</span>
                </div>
                <p className="text-3xl font-extrabold font-mono text-white tracking-tight">
                  Top {100 - result.percentile}%
                </p>
                <p className="text-[11px] text-white/60">
                  Melampaui {result.percentile}% peserta lainnya
                </p>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block">Akurasi Soal</span>
                  <strong className="text-sm text-emerald-400 font-bold">
                    {result.questions_correct} / {result.total_questions}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-[10px] text-white/50 block">Waktu Fokus</span>
                  <strong className="text-sm text-white font-bold flex items-center justify-center space-x-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    <span>{formatSeconds(result.time_spent_seconds)}</span>
                  </strong>
                </div>
              </div>

              {/* Inspiring Dedication Quote */}
              <div className="p-3 rounded-lg bg-white/[0.04] border-l-2 border-amber-400 text-left">
                <p className="text-[11px] italic text-white/80 leading-relaxed">
                  "{activeQuote}"
                </p>
              </div>
            </div>

            {/* Bottom Footer & QR Verification */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between relative z-10">
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold text-white/90">
                  Pejuang Tangguh
                </p>
                <p className="text-[10px] text-white/50 font-mono">
                  {new Date(result.submitted_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
                <span className="inline-flex items-center space-x-1 text-[9px] text-blue-400 font-mono">
                  <Award className="w-2.5 h-2.5" />
                  <span>Terverifikasi TestHub</span>
                </span>
              </div>

              {qrDataUrl && (
                <div className="p-1 rounded bg-[#0B0F17] border border-white/15">
                  <img src={qrDataUrl} alt="QR Code" className="w-12 h-12 rounded" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customization Controls */}
        <div className="space-y-3 pt-2 border-t border-borderline">
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5 flex items-center space-x-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Pilih Kata Motivasi atau Tuliskan Doa Khusus:</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {INSPIRATIONAL_QUOTES.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedQuoteIdx(idx)
                    setCustomDedication('')
                  }}
                  className={`text-[11px] p-2 text-left rounded border transition-colors line-clamp-1 ${
                    selectedQuoteIdx === idx && !customDedication
                      ? 'border-accent bg-accent/10 font-semibold text-accent'
                      : 'border-borderline bg-canvas text-ink-muted hover:text-ink'
                  }`}
                >
                  Opsi {idx + 1}: {q.substring(0, 32)}...
                </button>
              ))}
            </div>
            <input
              type="text"
              value={customDedication}
              onChange={(e) => setCustomDedication(e.target.value)}
              placeholder="Tulis dedikasi personal (misal: Untuk Ibu di kampung, bismillah NIP 2026)..."
              maxLength={120}
              className="w-full px-3 py-1.5 text-xs rounded-md bg-canvas border border-borderline text-ink focus:border-accent focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleCopyCaption}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-ink bg-surface hover:bg-surface-hover border border-borderline rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Caption Disalin!' : 'Salin Caption Story'}</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownloadStoryImage}
                disabled={isExporting}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:opacity-90 rounded-md shadow-sm transition-all disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses Gambar...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Gambar Story (PNG)</span>
                  </>
                )}
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
        </div>
      </div>
    </div>,
    document.body
  )
}
