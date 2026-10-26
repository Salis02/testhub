import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Test, Subscription } from '@/types'
import { testsApi } from '@/services/tests.api'
import { sessionsApi } from '@/services/sessions.api'
import { paymentsApi } from '@/services/payments.api'
import { CategoryBadge } from '@/components/common/Badge'
import {
  Search,
  Play,
  Clock,
  Award,
  CheckCircle2,
  Shield,
  Zap,
  ArrowRight,
  Trophy,
  Users,
  Sparkles,
  Flame,
  Check,
  Tag,
  Lock,
  ShieldCheck,
} from 'lucide-react'

import { TestCardSkeleton } from '@/components/common/Skeleton'
import { PaymentModal } from '@/components/common/PaymentModal'
import { LeaderboardModal } from '@/components/common/LeaderboardModal'
import { AhaMomentSection } from '@/components/home/AhaMomentSection'
import { HomeFAQ } from '@/components/home/HomeFAQ'
import { formatRupiah } from '@/utils/formatters'
import { ApiError, getStoredUserEmail } from '@/services/client'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'

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
  const [leaderboardTest, setLeaderboardTest] = useState<{ id: string; title: string } | null>(null)
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuth()

  const { data: rawTests = [], isLoading: loading } = useQuery({
    queryKey: ['tests', activeCategory, submittedQuery],
    queryFn: ({ signal }) => testsApi.listTests(activeCategory, submittedQuery, signal),
  })

  const { data: publicStats } = useQuery({
    queryKey: ['publicStats'],
    queryFn: ({ signal }) => testsApi.getPublicStats(signal),
    refetchInterval: 30000,
  })

  // Fetch active subscriptions if user is logged in
  const { data: userSubscriptions = [] } = useQuery<Subscription[]>({
    queryKey: ['user-subscriptions'],
    queryFn: () => paymentsApi.getUserSubscriptions(),
    enabled: !!user,
    staleTime: 60000,
  })

  const isSubActive = (sub: Subscription) => {
    if (sub.status !== 'active') return false
    if (!sub.valid_until) return true
    return new Date(sub.valid_until).getTime() > Date.now()
  }

  const getTestAccess = (test: Test) => {
    const price = test.price_idr || 0
    if (price === 0) return { unlocked: true, reason: 'free' as const }
    if (user?.role === 'admin' || user?.role === 'creator') return { unlocked: true, reason: 'role' as const }

    const hasSeasonPass = userSubscriptions.some(
      (s) => isSubActive(s) && (s.tier === 'season_pass' || s.tier === 'lifetime' || s.tier === 'institution')
    )
    if (hasSeasonPass) return { unlocked: true, reason: 'season_pass' as const }

    const hasPurchased = userSubscriptions.some(
      (s) => isSubActive(s) && s.test_id === test.id
    )
    if (hasPurchased) return { unlocked: true, reason: 'purchased' as const }

    return { unlocked: false, reason: 'locked' as const }
  }

  const tests = rawTests.filter((t) => t.published)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedQuery(searchQuery.trim())
  }

  const handleStartTest = async (testId: string, email?: string) => {
    try {
      const targetTest = tests.find((t) => t.id === testId)
      // Strict Paywall: Paid tests require authenticated session
      if (targetTest?.price_idr && targetTest.price_idr > 0 && !isAuthenticated) {
        toast.info(
          'Login Diperlukan',
          'Silakan masuk atau mendaftar terlebih dahulu untuk mengakses tryout berbayar ini.'
        )
        navigate('/login', { state: { from: `/?start=${testId}` } })
        return
      }

      const effectiveEmail = email || user?.email || getStoredUserEmail() || undefined
      const session = await sessionsApi.startTest(testId, effectiveEmail)
      navigate(`/test/${session.test.id}?session=${session.session_id}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.info(
          'Login Diperlukan',
          'Sesi login Anda diperlukan untuk mengakses modul ujian ini.'
        )
        navigate('/login', { state: { from: `/?start=${testId}` } })
        return
      }
      if (err instanceof ApiError && err.status === 402) {
        const targetTest = tests.find((t) => t.id === testId)
        const details = (err.details as Record<string, unknown>) || {}
        setPaywallModalData({
          testId,
          title: (details.title as string) || targetTest?.title || 'Modul Ujian Premium',
          priceIdr: (details.price_idr as number) || targetTest?.price_idr || 15000,
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

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-16 py-6 sm:py-10">
      {/* Zona 1: Hero Section with Emotional Copy & Live Social Pulse (FE-HP-01) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        {/* Live Social Pulse Counter & Avatar Stack */}
        <div className="inline-flex flex-wrap items-center justify-center gap-2 p-1.5 px-3.5 rounded-full border border-borderline bg-surface/90 text-xs font-mono shadow-subtle">
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {publicStats !== undefined
                ? `${publicStats.active_examinees.toLocaleString('id-ID')} peserta`
                : '184 peserta'}
            </span>
            <span className="text-ink-muted">sedang simulasi sekarang</span>
          </div>

          <span className="text-borderline hidden sm:inline">•</span>

          <div className="flex items-center space-x-1.5 text-ink-muted">
            <Users className="w-3.5 h-3.5 text-accent" />
            <span>
              <strong className="text-ink font-semibold">
                {publicStats !== undefined
                  ? (publicStats.monthly_examinees || publicStats.total_examinees).toLocaleString('id-ID')
                  : '14.800+'}
              </strong>{' '}
              pejuang NIP & PTN bulan ini
            </span>
          </div>
        </div>

        {/* Loss Aversion Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-ink tracking-tight leading-[1.15]">
          Ketahui Kelemahanmu Hari Ini, <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-blue-500">
            Bukan di Lembar Pengumuman
          </span>{' '}
          Tes Asli.
        </h1>

        {/* Cognitive-Calm Subtitle */}
        <p className="text-sm sm:text-base text-ink-muted max-w-2xl mx-auto leading-relaxed">
          Simulasi CAT CPNS, UTBK-SNBT, dan BUMN dengan persentil nasional riil. 100% tanpa login awal, mulai pengerjaan dalam 10 detik.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={scrollToCatalog}
            className="btn-press focus-ring inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-accent text-white text-sm font-semibold hover:brightness-105 shadow-subtle transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Mulai Ujian Gratis Sekarang</span>
          </button>

          <Link
            to="/pricing"
            className="btn-press focus-ring inline-flex items-center space-x-2 px-5 py-3 rounded-lg border border-borderline bg-surface hover:bg-surface-hover text-ink text-sm font-medium shadow-subtle transition-all"
          >
            <span>Paket Season Pass</span>
            <ArrowRight className="w-4 h-4 text-ink-muted" />
          </Link>
        </div>

        {/* Search & Filter Bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex items-center space-x-2 pt-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari simulasi (misal: CPNS, Silogisme, Matematika, IQ)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-borderline bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent shadow-subtle"
            />
          </div>
          <button
            type="submit"
            className="btn-press px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-95 shadow-xs transition-opacity cursor-pointer"
          >
            Cari
          </button>
        </form>

        {/* Zona 2: Authority & Compliance Strip (FE-HP-02) */}
        <div className="pt-2 max-w-3xl mx-auto">
          <div className="p-3 sm:p-4 rounded-xl border border-borderline/80 bg-surface/70 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left text-xs font-mono text-ink-muted">
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span className="truncate" title="Standar Kisi-Kisi KepmenPAN-RB No. 321 (SKD 2026)">
                KepmenPAN-RB No. 321 (SKD)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span className="truncate" title="Format Item Penalaran Matematika BPPP Kemendikbud">
                Format BPPP Kemendikbud
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span className="truncate" title="Core Values AKHLAK 6 Pilar BUMN">
                Core Values AKHLAK BUMN
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Zona 3: Available Tests Catalog & Zero Bait-and-Switch Pricing (FE-HP-03) */}
      <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4">
        {/* Category Filter Tabs */}
        <div className="flex items-center justify-between border-b border-borderline pb-4 flex-wrap gap-3">
          <div className="flex items-center space-x-1 overflow-x-auto text-xs font-mono max-w-full">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setSearchParams(c.key === 'all' ? {} : { category: c.key })}
                className={`px-3.5 py-1.5 rounded-lg btn-press focus-ring transition-colors whitespace-nowrap cursor-pointer ${activeCategory === c.key
                    ? 'bg-accent text-white font-semibold shadow-xs'
                    : 'bg-surface text-ink-muted border border-borderline hover:text-ink hover:bg-surface-hover'
                  }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-ink-muted">
            Menampilkan <strong className="text-ink">{tests.length}</strong> modul siap dikerjakan
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
          <div className="py-16 text-center border border-borderline rounded-xl bg-surface space-y-3">
            <p className="text-sm font-medium text-ink">Tidak ditemukan modul ujian yang sesuai.</p>
            <p className="text-xs text-ink-muted">Coba kata kunci lain atau pilih kategori Semua Ujian.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {tests.map((test, index) => {
              const access = getTestAccess(test)
              const isPremium = test.price_idr && test.price_idr > 0
              const isFeatured = test.is_flagship || (index === 0 && activeCategory === 'all')

              return (
                <div
                  key={test.id}
                  className={`bg-surface surface-card border rounded-xl p-6 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 ease-out flex flex-col justify-between space-y-5 relative ${isFeatured
                      ? 'border-accent/60 ring-1 ring-accent/30'
                      : access.unlocked && access.reason !== 'free'
                      ? 'border-emerald-500/40 hover:border-emerald-500/60'
                      : 'border-borderline hover:border-accent/40'
                    }`}
                >
                  {/* Flagship Badge */}
                  {isFeatured && (
                    <div className="absolute -top-3 left-6 inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-accent text-white text-[10px] font-mono font-bold tracking-wider uppercase shadow-xs">
                      <Flame className="w-3 h-3 fill-current" />
                      <span>TRYOUT AKBAR MINGGU INI</span>
                    </div>
                  )}

                  <div className="space-y-3 pt-1">
                    {/* Header Strip: Category & Dynamic Ownership / Price Badge */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CategoryBadge category={test.category} />

                      {/* Transparent Dynamic Status Badge */}
                      {access.unlocked ? (
                        access.reason === 'free' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span>GRATIS / FREE ACCESS</span>
                          </span>
                        ) : access.reason === 'season_pass' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-xs">
                            <Sparkles className="w-3 h-3 text-indigo-500 fill-current" />
                            <span>VIP PASS • TERBUKA</span>
                          </span>
                        ) : access.reason === 'purchased' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>SUDAH DIBELI • TERBUKA</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                            <ShieldCheck className="w-3 h-3 text-sky-500" />
                            <span>AKSES PENGUJI</span>
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md font-mono text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <Tag className="w-3 h-3" />
                          <span>PREMIUM • {formatRupiah(test.price_idr)}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-ink leading-snug">
                      {test.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-ink-muted leading-relaxed line-clamp-3">
                      {test.description}
                    </p>
                  </div>

                  {/* Challenge Metrics & CTA */}
                  <div className="pt-4 border-t border-borderline flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center space-x-3 text-xs font-mono text-ink-muted tabular-nums">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{test.duration_minutes}m</span>
                      </span>
                      <span>•</span>
                      <span>{test.total_questions} Soal</span>
                      <span>•</span>
                      <span className="text-ink font-semibold">
                        Passing: {test.passing_score_percentage}%
                      </span>
                      {test.total_takers !== undefined && test.total_takers > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-accent font-semibold">
                            {test.total_takers.toLocaleString('id-ID')} Peserta
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setLeaderboardTest({ id: test.id, title: test.title })}
                        className="inline-flex items-center space-x-1 px-2.5 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-borderline text-ink text-xs font-medium btn-press focus-ring transition-all cursor-pointer shadow-subtle"
                        title="Lihat Papan Peringkat Peserta"
                      >
                        <Trophy className="w-3.5 h-3.5 text-warning" />
                        <span className="hidden sm:inline">Peringkat</span>
                      </button>

                      {access.unlocked ? (
                        <button
                          onClick={() => handleStartTest(test.id)}
                          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-accent text-white hover:brightness-105 btn-press focus-ring shadow-subtle transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{access.reason === 'free' ? 'Mulai Ujian' : 'Mulai / Kerjakan Ulang'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartTest(test.id)}
                          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-500 btn-press focus-ring shadow-subtle transition-all cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Buka Akses Tryout</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Zona 4: The "AHA!" Moment Interactive Preview (FE-HP-04) */}
      <AhaMomentSection totalExaminees={publicStats?.total_examinees || publicStats?.monthly_examinees} />

      {/* Zona 5: Risk Reversal FAQ Accordion (FE-HP-05) */}
      <HomeFAQ />

      {/* Monetization / Pricing Teaser */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-2xl border border-borderline bg-surface text-ink flex flex-col md:flex-row items-center justify-between gap-6 shadow-card">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-mono font-semibold text-accent uppercase tracking-wider">
              Model Akses Terbuka (Freemium + Pro)
            </span>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Akses Seluruh Modul Tryout Tanpa Batas dengan Season Pass
            </h3>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Mulai dari Rp 75.000 untuk 90 hari akses penuh modul CPNS, UTBK, BUMN, ekspor pembahasan PDF lengkap, dan jaminan update kisi-kisi resmi.
            </p>
          </div>

          <Link
            to="/pricing"
            className="btn-press focus-ring inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-ink text-canvas font-semibold text-xs hover:opacity-90 transition-opacity flex-shrink-0 shadow-subtle"
          >
            <span>Bandingkan Paket Harga</span>
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
          onPaymentSuccess={(paidEmail) => {
            const id = paywallModalData.testId
            setPaywallModalData(null)
            queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] })
            queryClient.invalidateQueries({ queryKey: ['tests'] })
            handleStartTest(id, paidEmail)
          }}
        />
      )}

      {/* Public Leaderboard Modal */}
      {leaderboardTest && (
        <LeaderboardModal
          isOpen={!!leaderboardTest}
          onClose={() => setLeaderboardTest(null)}
          testId={leaderboardTest.id}
          testTitle={leaderboardTest.title}
        />
      )}
    </div>
  )
}
