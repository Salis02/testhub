import React, { useState } from 'react'
import { ChevronDown, HelpCircle, Shield, Smartphone, WifiOff, Zap } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
  icon: React.ElementType
}

export const HomeFAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const faqs: FAQItem[] = [
    {
      question: 'Apakah saya wajib registrasi / buat akun terlebih dahulu untuk mulai ujian?',
      answer:
        'Sama sekali tidak wajib! Anda cukup memilih modul ujian yang diinginkan dan klik "Mulai Ujian". Sistem TestHub secara otomatis membuat sesi ujian unik dan mengamankan lembar pengerjaan Anda di browser tanpa hambatan form registrasi yang merepotkan.',
      icon: Zap,
    },
    {
      question: 'Apakah simulasi ini nyaman dikerjakan langsung lewat browser smartphone (HP)?',
      answer:
        'Ya, 100% responsif. Antarmuka ujian TestHub dirancang khusus dengan drawer nomor soal yang mudah dijangkau satu jempol, tombol pilihan opsi ramah sentuhan, dan performa rendering 60 FPS tanpa lag di seluruh peramban ponsel.',
      icon: Smartphone,
    },
    {
      question: 'Bagaimana jika koneksi internet saya tiba-tiba terputus saat ujian sedang berlangsung?',
      answer:
        'Tenang, ujian Anda aman. Fitur Offline Resilience TestHub secara otomatis menyimpan setiap ketukan jawaban ke memori lokal peramban Anda. Begitu koneksi internet kembali pulih, seluruh jawaban akan langsung tersinkronisasi otomatis ke server tanpa kehilangan progres.',
      icon: WifiOff,
    },
    {
      question: 'Apakah ada modul gratis dan bagaimana dengan ujian berbayar?',
      answer:
        'Seluruh modul bertanda badge hijau "GRATIS" bebas dikerjakan kapan saja tanpa biaya. Untuk modul bertanda "PREMIUM", Anda dapat membukanya per modul melalui pembayaran instan QRIS (GoPay, OVO, Dana, BCA, dll.) atau berlangganan Season Pass untuk akses tanpa batas.',
      icon: Shield,
    },
  ]

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-borderline bg-surface text-ink text-xs font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-accent" />
            <span>Pertanyaan yang Sering Diajukan (FAQ)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            Semua yang Perlu Anda Ketahui Sebelum Mulai
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted">
            Transparansi penuh, tanpa hambatan tersembunyi, dan dirancang untuk kenyamanan fokus belajar Anda.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx
            const Icon = faq.icon

            return (
              <div
                key={idx}
                className={`border rounded-xl transition-all duration-150 overflow-hidden ${
                  isOpen
                    ? 'border-accent/40 bg-surface shadow-card'
                    : 'border-borderline bg-surface/60 hover:bg-surface hover:border-borderline/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 btn-press focus-ring cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isOpen ? 'bg-accent text-white' : 'bg-canvas text-ink-muted border border-borderline'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-semibold text-ink leading-snug">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-ink-muted flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-accent' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-ink-muted leading-relaxed border-t border-borderline/50 mt-1 animate-in fade-in duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
