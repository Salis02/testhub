import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Users, Award, Percent, X, Loader2, ArrowUpRight, TrendingUp } from 'lucide-react'
import { adminApi } from '@/services/admin.api'
import { TestAnalytics } from '@/types'

interface TestAnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  testId: string
  testTitle?: string
}

export const TestAnalyticsModal: React.FC<TestAnalyticsModalProps> = ({
  isOpen,
  onClose,
  testId,
  testTitle,
}) => {
  const { data: analytics, isLoading, error } = useQuery<TestAnalytics>({
    queryKey: ['admin-test-analytics', testId],
    queryFn: ({ signal }) => adminApi.getTestAnalytics(testId, signal),
    enabled: isOpen && !!testId,
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 dark:bg-black/65 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-6 my-8 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Analitik Performa Ujian</h3>
              <p className="text-xs text-ink-muted line-clamp-1">
                {analytics?.test_title || testTitle || 'Modul Ujian'}
              </p>
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

        {/* Content */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-accent" />
            <p className="text-xs text-ink-muted">Memuat statistik pengerjaan ujian...</p>
          </div>
        ) : error || !analytics ? (
          <div className="py-8 text-center text-sm text-red-500">
            Gagal memuat analitik modul ujian. Silakan coba lagi.
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total Submissions */}
              <div className="bg-canvas border border-borderline rounded-md p-3.5 space-y-1">
                <div className="flex items-center justify-between text-ink-muted">
                  <span className="text-[11px] uppercase font-medium">Peserta</span>
                  <Users className="w-3.5 h-3.5" />
                </div>
                <p className="text-2xl font-bold font-mono text-ink tabular-nums">
                  {analytics.total_submissions}
                </p>
                <p className="text-[10px] text-ink-muted">Telah selesai ujian</p>
              </div>

              {/* Average Score */}
              <div className="bg-canvas border border-borderline rounded-md p-3.5 space-y-1">
                <div className="flex items-center justify-between text-ink-muted">
                  <span className="text-[11px] uppercase font-medium">Rata-Rata</span>
                  <Award className="w-3.5 h-3.5" />
                </div>
                <p className="text-2xl font-bold font-mono text-accent tabular-nums">
                  {analytics.average_score.toFixed(1)}%
                </p>
                <p className="text-[10px] text-ink-muted">Skor keseluruhan</p>
              </div>

              {/* Passing Rate */}
              <div className="bg-canvas border border-borderline rounded-md p-3.5 space-y-1">
                <div className="flex items-center justify-between text-ink-muted">
                  <span className="text-[11px] uppercase font-medium">Tingkat Lulus</span>
                  <Percent className="w-3.5 h-3.5" />
                </div>
                <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {analytics.passing_rate.toFixed(1)}%
                </p>
                <p className="text-[10px] text-ink-muted">Mencapai batas passing</p>
              </div>
            </div>

            {/* Visual Progress Bar for Passing Rate */}
            <div className="space-y-2 p-4 rounded-md bg-canvas border border-borderline">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-ink flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  <span>Distribusi Kelulusan Peserta</span>
                </span>
                <span className="font-mono font-semibold text-accent">
                  {analytics.passing_rate.toFixed(1)}% Lulus
                </span>
              </div>
              <div className="w-full bg-surface-hover rounded-full h-2.5 overflow-hidden border border-borderline">
                <div
                  className="bg-accent h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, analytics.passing_rate))}%` }}
                />
              </div>
              <p className="text-[11px] text-ink-muted pt-1">
                {analytics.total_submissions === 0
                  ? 'Belum ada data pengerjaan yang tercatat untuk modul ini.'
                  : `${Math.round((analytics.total_submissions * analytics.passing_rate) / 100)} dari ${analytics.total_submissions} peserta berhasil lulus passing grade.`}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-borderline flex justify-end">
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
  )
}
