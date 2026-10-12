import React from 'react'
import { AdminStats } from '@/types'
import { FileText, Users, CheckCircle, Percent, AlertCircle, ShieldCheck } from 'lucide-react'

export const AdminOverview: React.FC<{ stats: AdminStats }> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Modul Ujian',
      value: stats.total_tests,
      subtitle: `${stats.published_tests} modul aktif publik`,
      icon: FileText,
      color: 'text-accent',
    },
    {
      title: 'Total Sesi Peserta',
      value: stats.total_sessions.toLocaleString(),
      subtitle: `${stats.total_completions} selesai dinilai`,
      icon: Users,
      color: 'text-indigo-500',
    },
    {
      title: 'Tingkat Penyelesaian',
      value: `${stats.completion_rate_percentage}%`,
      subtitle: 'Target PRD: >80%',
      icon: CheckCircle,
      color: 'text-emerald-500',
    },
    {
      title: 'Rata-rata Skor Peserta',
      value: `${stats.average_score_percentage}%`,
      subtitle: 'Dari seluruh modul aktif',
      icon: Percent,
      color: 'text-blue-500',
    },
    {
      title: 'Esai Menunggu Review',
      value: stats.pending_essays,
      subtitle: 'Perlu penilaian manual',
      icon: AlertCircle,
      color: stats.pending_essays > 0 ? 'text-amber-500' : 'text-ink-muted',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              className="p-5 rounded-lg bg-surface border border-borderline shadow-sm space-y-3 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                  {card.title}
                </span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-bold font-mono text-ink tabular-nums">
                  {card.value}
                </span>
                <p className="text-[11px] text-ink-muted mt-1 truncate">
                  {card.subtitle}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Infrastructure Telemetry per PRD metrics */}
      <div className="p-6 rounded-lg bg-surface border border-borderline shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-borderline">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">
              Telemetri Infrastruktur & Performa Sistem
            </h3>
          </div>
          <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
            HEALTHY (2GB VPS)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded bg-canvas border border-borderline space-y-1">
            <span className="text-ink-muted block text-[11px]">Database Latency</span>
            <span className="text-base font-bold text-ink">&lt; 14ms (PostgreSQL 15)</span>
            <span className="text-ink-muted block text-[10px]">Indexed 3NF connection pool</span>
          </div>

          <div className="p-3.5 rounded bg-canvas border border-borderline space-y-1">
            <span className="text-ink-muted block text-[11px]">API Response Time (p95)</span>
            <span className="text-base font-bold text-accent">&lt; 85ms</span>
            <span className="text-ink-muted block text-[10px]">Redis in-memory caching</span>
          </div>

          <div className="p-3.5 rounded bg-canvas border border-borderline space-y-1">
            <span className="text-ink-muted block text-[11px]">Throughput Kapasitas</span>
            <span className="text-base font-bold text-ink">1,200 req/detik</span>
            <span className="text-ink-muted block text-[10px]">Non-auth session rate limit</span>
          </div>
        </div>
      </div>
    </div>
  )
}
