import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { paymentsApi } from '@/services/payments.api'
import { useAuth } from '@/context/AuthContext'
import { Subscription } from '@/types'
import { SubscriptionListSkeleton } from '@/components/common/Skeleton'
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react'

export const MySubscriptionsPage: React.FC = () => {
  const { user } = useAuth()

  const { data: subscriptions = [], isLoading, error, refetch } = useQuery<Subscription[]>({
    queryKey: ['user-subscriptions'],
    queryFn: () => paymentsApi.getUserSubscriptions(),
    enabled: !!user,
  })

  const formatRupiah = (val?: number) => {
    if (!val) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Akses Permanen / Tidak Berbatas'
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const isExpired = (validUntil?: string | null) => {
    if (!validUntil) return false
    return new Date(validUntil).getTime() < Date.now()
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {isLoading ? (
        <SubscriptionListSkeleton />
      ) : (
        <>
          {/* User Profile Overview Header */}
          <div className="bg-surface border border-borderline rounded-lg p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 text-accent font-bold flex items-center justify-center text-lg">
              {user?.fullName?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-ink">
                {user?.fullName || 'Akun Peserta'}
              </h1>
              <p className="text-xs font-mono text-ink-muted">{user?.email}</p>
            </div>
          </div>
          <p className="text-xs text-ink-muted max-w-xl leading-relaxed pt-1">
            Pantau hak akses modul tryout, masa berlaku langganan aktif, dan riwayat lisensi akun Anda.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded border border-borderline bg-canvas text-xs font-mono text-ink">
            Peran: <strong className="text-accent uppercase">{user?.role || 'user'}</strong>
          </span>
          <Link
            to="/pricing"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Beli Paket Baru</span>
          </Link>
        </div>
      </div>

      {/* Subscription List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-accent" />
            <h2 className="text-base sm:text-lg font-bold text-ink">
              Daftar Langganan & Akses Modul Aktif
            </h2>
          </div>
          <span className="text-xs font-mono text-ink-muted">
            Total: {subscriptions.length} Paket
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="p-6 rounded-lg border border-borderline bg-surface animate-pulse space-y-4">
                <div className="h-4 bg-canvas rounded w-1/3"></div>
                <div className="h-8 bg-canvas rounded w-2/3"></div>
                <div className="h-4 bg-canvas rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 text-xs flex items-center justify-between">
            <span>Gagal memuat riwayat langganan: {(error as Error).message}</span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 bg-red-500 text-white rounded font-semibold text-[11px]"
            >
              Coba Lagi
            </button>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="bg-surface border border-borderline rounded-lg p-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-surface border border-borderline flex items-center justify-center mx-auto text-ink-muted">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">Belum Ada Paket Langganan Aktif</h3>
              <p className="text-xs text-ink-muted max-w-md mx-auto">
                Anda belum memiliki modul tryout berbayar atau Season Pass. Akses tryout gratis atau pilih paket langganan untuk pembahasan komprehensif.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md border border-borderline bg-canvas text-xs font-semibold text-ink hover:bg-surface-hover"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Coba Ujian Gratis</span>
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs"
              >
                <span>Lihat Pilihan Paket</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.map((sub) => {
              const expired = isExpired(sub.valid_until)
              const isActive = sub.status === 'active' && !expired

              return (
                <div
                  key={sub.id}
                  className={`rounded-lg border p-5 sm:p-6 bg-surface transition-all flex flex-col justify-between space-y-4 ${
                    isActive ? 'border-borderline shadow-xs' : 'border-borderline/60 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded uppercase font-semibold bg-canvas border border-borderline text-ink">
                        {sub.tier.replace('_', ' ')}
                      </span>

                      {isActive ? (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-ink-muted">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{expired ? 'Kadaluarsa' : sub.status}</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-ink">
                        {sub.test_title ||
                          (sub.tier === 'season_pass'
                            ? 'Season Pass All-Access (90 Hari)'
                            : sub.tier === 'lifetime'
                            ? 'Lifetime Access Selamanya'
                            : 'Paket Ujian Tryout')}
                      </h3>
                      {sub.category && (
                        <span className="text-[11px] text-ink-muted font-mono capitalize">
                          Kategori: {sub.category}
                        </span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-borderline/60 space-y-1.5 text-xs text-ink-muted font-mono">
                      <div className="flex justify-between">
                        <span>Biaya Terbayar:</span>
                        <span className="text-ink font-semibold">{formatRupiah(sub.amount_paid)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Masa Berlaku:</span>
                        <span className={expired ? 'text-rose-500 font-semibold' : 'text-ink'}>
                          {formatDate(sub.valid_until)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-borderline/60 flex items-center justify-between">
                    <span className="text-[10px] text-ink-muted font-mono">ID: {sub.id}</span>
                    {sub.test_id ? (
                      <Link
                        to={`/test/${sub.test_id}`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        <span>Buka Ujian</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ) : (
                      <Link
                        to="/"
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        <span>Mulai Semua Ujian</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}
