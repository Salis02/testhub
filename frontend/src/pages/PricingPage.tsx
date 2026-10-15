import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import { PaymentModal } from '@/components/common/PaymentModal'
import { SubscriptionTier } from '@/types'

export const PricingPage: React.FC = () => {
  const navigate = useNavigate()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionTier>('season_pass')

  const openCheckout = (plan: SubscriptionTier) => {
    setCheckoutPlan(plan)
    setIsCheckoutOpen(true)
  }

  const tiers = [
    {
      name: 'Free / Uji Coba',
      price: 'Rp 0',
      period: 'gratis selamanya',
      desc: 'Cocok untuk persiapan awal individu tanpa kewajiban komitmen.',
      badge: 'Starter',
      featured: false,
      features: [
        '3 sesi ujian gratis per bulan',
        'Auto-scoring nilai instan',
        'Retensi riwayat hasil 24 jam',
        'Analisis persentil dasar',
        'Akses ke bank soal publik',
      ],
      cta: 'Mulai Gratis',
      href: '/',
      isCheckout: false,
    },
    {
      name: 'Basic Individu',
      price: 'Rp 75.000',
      period: 'per bulan',
      desc: 'Rekomendasi terbaik untuk pejuang CPNS, UTBK-SNBT, dan tes kedinasan.',
      badge: 'Paling Populer',
      featured: true,
      features: [
        'Ujian tryout tanpa batas',
        'Pembahasan lengkap & rasionalisasi',
        'Histori performa tersimpan 1 tahun',
        'Cetak & unduh rekap nilai (PDF)',
        'Analisis radar kompetensi detail',
        'Bebas gangguan banner promosi',
      ],
      cta: 'Pilih Paket Basic',
      href: '',
      isCheckout: true,
      plan: 'season_pass' as SubscriptionTier,
    },
    {
      name: 'Pro Creator',
      price: 'Rp 150.000',
      period: 'per bulan',
      desc: 'Dirancang bagi pengajar, bimbel mandiri, dan kreator konten ujian.',
      badge: 'Kreator',
      featured: false,
      features: [
        'Semua keuntungan Paket Basic',
        'Buat & publikasikan ujian mandiri',
        'Dashboard analitik performa peserta',
        'Hingga 100 butir soal per bulan',
        '5 slot modul ujian kustom aktif',
        'AI Question Generator Assistant',
        'Ekspor data peserta format CSV/Excel',
      ],
      cta: 'Daftar Sebagai Pengajar',
      href: '/admin',
      isCheckout: false,
    },
    {
      name: 'Institusi / B2B',
      price: 'Hubungi Kami',
      period: 'mulai Rp 2.000.000/thn',
      desc: 'Solusi enterprise untuk sekolah, universitas, dinas, dan korporasi BUMN.',
      badge: 'Enterprise',
      featured: false,
      features: [
        'Kapasitas ujian tanpa batas',
        'Opsi custom domain / White-label',
        'Integrasi API & Single Sign-On (SSO)',
        'Manajemen pengguna massal (Bulk users)',
        'SLA uptime 99.9% dengan server khusus',
        'Dukungan prioritas 24/7 & pelatihan tim',
      ],
      cta: 'Konsultasi Institusi',
      href: 'mailto:support@testhub.id',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
      {/* Title */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-mono font-semibold text-accent uppercase tracking-wider">
          Skema Monetisasi & Lisensi TestHub SaaS
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-ink">
          Pilihan Paket Transparan Sesuai Kebutuhan Anda
        </h1>
        <p className="text-sm text-ink-muted leading-relaxed">
          Tingkatkan akurasi dan kesiapan menghadapi seleksi nasional dengan instrumen evaluasi berstandar industri.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-6 flex flex-col justify-between transition-all ${
              tier.featured
                ? 'bg-surface border-accent shadow-md ring-1 ring-accent'
                : 'bg-surface border-borderline shadow-sm hover:border-ink-muted'
            }`}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                  {tier.name}
                </span>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                    tier.featured
                      ? 'bg-accent text-white'
                      : 'bg-canvas border border-borderline text-ink'
                  }`}
                >
                  {tier.badge}
                </span>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold font-mono text-ink">
                  {tier.price}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {tier.period}
                </div>
              </div>

              <p className="text-xs text-ink-muted leading-relaxed">
                {tier.desc}
              </p>

              {/* Feature list */}
              <div className="pt-4 border-t border-borderline space-y-2.5">
                <span className="text-[11px] font-semibold text-ink uppercase tracking-wider block font-mono">
                  Fitur Unggulan:
                </span>
                {tier.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-start space-x-2 text-xs text-ink/90">
                    <Check className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-borderline">
              {tier.isCheckout ? (
                <button
                  type="button"
                  onClick={() => openCheckout(tier.plan || 'season_pass')}
                  className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                    tier.featured
                      ? 'bg-accent text-white hover:opacity-95 shadow-xs'
                      : 'border border-borderline bg-canvas text-ink hover:bg-surface-hover'
                  }`}
                >
                  <span>{tier.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Link
                  to={tier.href}
                  className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors ${
                    tier.featured
                      ? 'bg-accent text-white hover:opacity-95 shadow-xs'
                      : 'border border-borderline bg-canvas text-ink hover:bg-surface-hover'
                  }`}
                >
                  <span>{tier.cta}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Payment Checkout Modal for direct subscription */}
      {isCheckoutOpen && (
        <PaymentModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          initialPlan={checkoutPlan}
          testTitle="Paket Langganan TestHub"
          priceIdr={75000}
          onPaymentSuccess={() => {
            setIsCheckoutOpen(false)
            navigate('/')
          }}
        />
      )}

      {/* FAQ Snippet */}
      <div className="max-w-3xl mx-auto pt-8 border-t border-borderline space-y-6">
        <h3 className="text-lg font-semibold text-ink text-center">
          Pertanyaan Umum Mengenai Pembayaran & Langganan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-md bg-surface border border-borderline space-y-1.5">
            <h4 className="font-semibold text-ink">Apakah butuh registrasi untuk tes gratis?</h4>
            <p className="text-ink-muted leading-relaxed">
              Tidak. Pengguna langsung mendapatkan token sesi unik tanpa perlu login untuk mencoba simulasi gratis.
            </p>
          </div>

          <div className="p-4 rounded-md bg-surface border border-borderline space-y-1.5">
            <h4 className="font-semibold text-ink">Metode pembayaran apa saja yang didukung?</h4>
            <p className="text-ink-muted leading-relaxed">
              Kami mendukung pembayaran lokal (QRIS, VA Bank Mandiri/BCA/BRI, GoPay) via Midtrans, serta kartu kredit internasional via Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
