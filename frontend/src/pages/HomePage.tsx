import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Test } from '@/types'
import { testsApi } from '@/services/tests.api'
import { sessionsApi } from '@/services/sessions.api'
import { CategoryBadge } from '@/components/common/Badge'
import { Search, Play, Clock, Award, CheckCircle2, Shield, Zap, ArrowRight } from 'lucide-react'

import { TestCardSkeleton } from '@/components/common/Skeleton'
import { PaymentModal } from '@/components/common/PaymentModal'
import { ApiError } from '@/services/client'
import { useToast } from '@/context/ToastContext'

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || 'all'
  const [searchQuery, setSearchQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [paywallModalData, setPaywallModalData] = useState<{
    testId: string
    title: string
    priceIdr: number
  } | null>(null)
  const navigate = useNavigate()
  const toast = useToast()

  const { data: rawTests = [], isLoading: loading } = useQuery({
    queryKey: ['tests', activeCategory, submittedQuery],
    queryFn: ({ signal }) => testsApi.listTests(activeCategory, submittedQuery, signal),
  })

  const tests = rawTests.filter((t) => t.published)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedQuery(searchQuery.trim())
  }

  const handleStartTest = async (testId: string) => {
    try {
      const session = await sessionsApi.startTest(testId)
      navigate(`/test/${session.test.id}?session=${session.session_id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        const targetTest = tests.find((t) => t.id === testId)
        const details = (err.details as Record<string, unknown>) || {}
        setPaywallModalData({
          testId,
          title: (details.title as string) || targetTest?.title || 'Modul Ujian Premium',
          priceIdr: (details.price_idr as number) || 15000,
        })
        return
      }
      toast.error('Gagal Memulai Ujian', (err as Error).message)
    }
  }

  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'Semua Ujian' },
    { key: 'cpns', label: 'CPNS / Kedinasan' },
    { key: 'sbmptn', label: 'UTBK-SNBT' },
    { key: 'iq', label: 'Tes IQ Raven' },
    { key: 'custom', label: 'BUMN AKHLAK' },
  ]

  return (
    <div className="space-y-12 py-8 sm:py-12">
      {/* Hero Section (Cognitive-Calm, Zero AI Slop per style.md) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-borderline bg-surface text-ink text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
          <span>Sistem Ujian Standar Nasional • Tanpa Registrasi Rumit</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold text-ink tracking-tight leading-tight">
          Asesmen Cepat, Presisi Tinggi, & Analitik Mendalam.
        </h1>

        <p className="text-sm sm:text-base text-ink-muted max-w-2xl mx-auto leading-relaxed">
          Platform tryout & simulasi ujian berstandar resmi (SKD CPNS, UTBK-SNBT, IQ Matrix, Core Values BUMN) dengan koreksi instan dan evaluasi persentil akurat.
        </p>

        {/* Search & Filter Bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex items-center space-x-2 pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari simulasi (misal: CPNS, Silogisme, Matematika, IQ)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-md border border-borderline bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-md bg-accent text-white text-sm font-semibold hover:opacity-95 shadow-xs transition-opacity"
          >
            Cari
          </button>
        </form>

        {/* Value Proposition Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs font-mono text-ink-muted max-w-3xl mx-auto">
          <div className="p-3 rounded border border-borderline bg-surface flex items-center justify-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span>Mulai Seketika</span>
          </div>
          <div className="p-3 rounded border border-borderline bg-surface flex items-center justify-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
            <span>Koreksi Otomatis</span>
          </div>
          <div className="p-3 rounded border border-borderline bg-surface flex items-center justify-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-accent" />
            <span>Anti-Kecurangan</span>
          </div>
          <div className="p-3 rounded border border-borderline bg-surface flex items-center justify-center space-x-1.5">
            <Award className="w-3.5 h-3.5 text-accent" />
            <span>Peringkat Persentil</span>
          </div>
        </div>
      </section>

      {/* Available Tests Catalog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Category Filter Tabs */}
        <div className="flex items-center justify-between border-b border-borderline pb-4 flex-wrap gap-3">
          <div className="flex items-center space-x-1 overflow-x-auto text-xs font-mono">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setSearchParams(c.key === 'all' ? {} : { category: c.key })}
                className={`px-3.5 py-1.5 rounded transition-colors whitespace-nowrap ${
                  activeCategory === c.key
                    ? 'bg-accent text-white font-semibold'
                    : 'bg-surface text-ink-muted border border-borderline hover:text-ink hover:bg-surface-hover'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-ink-muted">
            Menampilkan {tests.length} modul aktif
          </span>
        </div>

        {/* Tests Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <TestCardSkeleton />
            <TestCardSkeleton />
            <TestCardSkeleton />
            <TestCardSkeleton />
          </div>
        ) : tests.length === 0 ? (
          <div className="py-16 text-center border border-borderline rounded-lg bg-surface space-y-3">
            <p className="text-sm font-medium text-ink">Tidak ditemukan modul ujian yang sesuai.</p>
            <p className="text-xs text-ink-muted">Coba kata kunci lain atau pilih kategori Semua Ujian.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {tests.map((test) => (
              <div
                key={test.id}
                className="bg-surface border border-borderline rounded-lg p-6 shadow-sm hover:border-accent/50 transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <CategoryBadge category={test.category} />
                    <span className="text-xs font-mono text-ink-muted flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{test.duration_minutes} Menit</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-ink leading-snug">
                    {test.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-ink-muted leading-relaxed line-clamp-3">
                    {test.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-borderline flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-4 text-xs font-mono text-ink-muted">
                    <span>{test.total_questions} Soal</span>
                    <span>•</span>
                    <span>Lulus: {test.passing_score_percentage}%</span>
                  </div>

                  <button
                    onClick={() => handleStartTest(test.id)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Mulai Ujian</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Monetization / Pricing Teaser per PRD Section 5 */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="p-8 sm:p-10 rounded-lg border border-borderline bg-surface text-ink flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono font-semibold text-accent uppercase tracking-wider">
              Model Lisensi Terbuka (Freemium + Pro)
            </span>
            <h3 className="text-xl sm:text-2xl font-bold">
              Tingkatkan Kemampuan dengan Paket Pro & Institusi
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Mulai dari Rp 75.000/bulan untuk akses tryout tanpa batas, ekspor pembahasan PDF, histori performa 1 tahun, dan fitur pembuatan bank soal institusi.
            </p>
          </div>

          <Link
            to="/pricing"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-md bg-ink text-canvas font-semibold text-xs hover:opacity-90 transition-opacity flex-shrink-0"
          >
            <span>Lihat Skema Harga</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Paywall QRIS / Midtrans Payment Modal */}
      {paywallModalData && (
        <PaymentModal
          isOpen={!!paywallModalData}
          onClose={() => setPaywallModalData(null)}
          testId={paywallModalData.testId}
          testTitle={paywallModalData.title}
          priceIdr={paywallModalData.priceIdr}
          onPaymentSuccess={() => {
            const id = paywallModalData.testId
            setPaywallModalData(null)
            handleStartTest(id)
          }}
        />
      )}
    </div>
  )
}
