import React from 'react'
import { AdminStats, Test, EssaySubmission } from '@/types'
import {
  FileText,
  Users,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Plus,
  ArrowRight,
  Clock,
  Edit,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { CategoryBadge } from '@/components/common/Badge'

interface AdminOverviewProps {
  stats: AdminStats
  tests: Test[]
  essays: EssaySubmission[]
  onSelectTab: (tab: 'overview' | 'tests' | 'essays' | 'subscriptions') => void
  onOpenCreateModal: () => void
  onOpenAIModal: () => void
  onEditTest: (testId: string) => void
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  stats,
  tests,
  essays,
  onSelectTab,
  onOpenCreateModal,
  onOpenAIModal,
  onEditTest,
}) => {
  // 1. KPI Cards
  const kpiCards = [
    {
      title: 'Total Modul Ujian',
      value: stats.total_tests,
      subtitle: `${stats.published_tests} modul aktif publik`,
      icon: FileText,
      color: 'text-accent',
      onClick: () => onSelectTab('tests'),
    },
    {
      title: 'Total Sesi Peserta',
      value: stats.total_sessions.toLocaleString('id-ID'),
      subtitle: `${stats.total_completions} selesai dinilai`,
      icon: Users,
      color: 'text-accent',
      onClick: () => onSelectTab('tests'),
    },
    {
      title: 'Tingkat Kelulusan',
      value: `${stats.completion_rate_percentage}%`,
      subtitle: `Rata-rata skor: ${stats.average_score_percentage}%`,
      icon: CheckCircle,
      color: 'text-success',
      onClick: () => onSelectTab('tests'),
    },
    {
      title: 'Esai Perlu Review',
      value: stats.pending_essays,
      subtitle: stats.pending_essays > 0 ? 'Menunggu penilaian manual' : 'Semua telah dinilai',
      icon: AlertCircle,
      color: stats.pending_essays > 0 ? 'text-warning' : 'text-ink-muted',
      badge: stats.pending_essays > 0 ? `${stats.pending_essays} antrean` : undefined,
      onClick: () => onSelectTab('essays'),
    },
  ]

  // 2. Real Category Distribution Calculation
  const categoryCounts = tests.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1
    return acc
  }, {})

  const categoryLabels: Record<string, string> = {
    cpns: 'CPNS / Kedinasan',
    sbmptn: 'UTBK-SNBT',
    iq: 'Raven IQ Matrix',
    custom: 'BUMN AKHLAK',
  }

  // 3. Recent 4 tests
  const recentTests = tests.slice(0, 4)

  // 4. Pending essays
  const pendingEssays = essays.filter((e) => e.score === undefined).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className="p-5 rounded-lg bg-surface surface-card border border-borderline shadow-card hover:shadow-card-hover hover:border-accent/40 transition-all duration-200 cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-ink-muted">
                  {card.title}
                </span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>

              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl sm:text-3xl font-bold font-mono text-ink tabular-nums">
                    {card.value}
                  </span>
                  {card.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning-subtle text-warning border border-warning-border">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-muted mt-1 truncate">
                  {card.subtitle}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Action Cockpit Strip */}
      <div className="bg-surface surface-card border border-borderline rounded-lg p-4 shadow-card flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs text-ink-muted">
          <Layers className="w-4 h-4 text-accent" />
          <span className="font-semibold text-ink">Aksi Cepat Manajemen:</span>
          <span className="hidden md:inline">Akses cepat pembuatan modul dan generator AI</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenAIModal}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-accent/30 bg-accent-tint text-accent text-xs font-medium hover:bg-accent/15 btn-press focus-ring transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Question Generator</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md bg-accent text-white text-xs font-semibold hover:brightness-105 btn-press focus-ring shadow-subtle transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Ujian Baru</span>
          </button>
        </div>
      </div>

      {/* Main Dashboard Two-Column Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recent Test Modules Overview (7 cols) */}
        <div className="lg:col-span-7 bg-surface surface-card border border-borderline rounded-lg shadow-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-borderline">
            <div>
              <h3 className="text-sm font-semibold text-ink">Modul Ujian Terbaru</h3>
              <p className="text-xs text-ink-muted">Status kurikulum dan ringkasan modul aktif</p>
            </div>
            <button
              onClick={() => onSelectTab('tests')}
              className="text-xs font-semibold text-accent hover:underline inline-flex items-center space-x-1"
            >
              <span>Semua Modul ({tests.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-borderline/60">
            {recentTests.map((test) => (
              <div
                key={test.id}
                className="py-3.5 flex items-center justify-between gap-3 group hover:bg-surface-hover/50 px-2 rounded-md transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <CategoryBadge category={test.category} />
                    <span className="text-[11px] font-mono text-ink-muted flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{test.duration_minutes}m</span>
                    </span>
                    {test.published ? (
                      <span className="text-[10px] font-mono text-success px-1.5 py-0.2 rounded bg-success-subtle border border-success-border">
                        PUBLIK
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-ink-muted px-1.5 py-0.2 rounded bg-canvas border border-borderline">
                        DRAF
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-ink truncate group-hover:text-accent transition-colors">
                    {test.title}
                  </h4>
                  <p className="text-[11px] font-mono text-ink-muted">
                    {test.total_questions} Soal • Passing Grade: {test.passing_score_percentage}%
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onEditTest(test.id)}
                  className="p-1.5 rounded-md border border-borderline bg-surface hover:bg-surface-hover hover:border-ink/20 text-ink-muted hover:text-ink btn-press focus-ring transition-colors shrink-0"
                  title="Sunting modul dan butir soal"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {recentTests.length === 0 && (
              <div className="py-8 text-center text-xs text-ink-muted">
                Belum ada modul ujian yang dibuat.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pending Essays Queue & Real Category Distribution (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Priority Pending Essays Widget */}
          <div className="bg-surface surface-card border border-borderline rounded-lg shadow-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-borderline">
              <div className="flex items-center space-x-2">
                <AlertCircle className={`w-4 h-4 ${stats.pending_essays > 0 ? 'text-warning' : 'text-success'}`} />
                <h3 className="text-sm font-semibold text-ink">Antrean Koreksi Esai</h3>
              </div>
              <button
                onClick={() => onSelectTab('essays')}
                className="text-xs font-semibold text-accent hover:underline inline-flex items-center space-x-1"
              >
                <span>Buka Antrean ({stats.pending_essays})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {pendingEssays.length > 0 ? (
              <div className="space-y-2.5">
                {pendingEssays.map((essay) => (
                  <div
                    key={essay.id}
                    onClick={() => onSelectTab('essays')}
                    className="p-3 rounded-md bg-canvas border border-borderline hover:border-accent/40 cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
                      <span className="truncate max-w-[150px]">{essay.test_title}</span>
                      <span className="text-warning font-semibold text-[10px] bg-warning-subtle px-1.5 py-0.5 rounded border border-warning-border">
                        Perlu Review
                      </span>
                    </div>
                    <p className="text-xs text-ink line-clamp-1">
                      {essay.question_text}
                    </p>
                    <p className="text-[11px] text-ink-muted line-clamp-1 italic">
                      "{essay.user_answer_text}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center space-y-1 bg-canvas rounded-md border border-borderline">
                <CheckCircle className="w-6 h-6 text-success mx-auto" />
                <p className="text-xs font-semibold text-ink">Semua Esai Selesai Dikoreksi</p>
                <p className="text-[11px] text-ink-muted">Tidak ada antrean jawaban esai yang pending.</p>
              </div>
            )}
          </div>

          {/* Real Category Distribution */}
          <div className="bg-surface surface-card border border-borderline rounded-lg shadow-card p-5 space-y-4">
            <div className="pb-3 border-b border-borderline">
              <h3 className="text-sm font-semibold text-ink">Distribusi Modul Ujian</h3>
              <p className="text-xs text-ink-muted">Peta sebaran kategori asesmen di bank soal</p>
            </div>

            <div className="space-y-3">
              {Object.entries(categoryCounts).map(([catKey, count]) => {
                const label = categoryLabels[catKey] || catKey.toUpperCase()
                const percent = tests.length > 0 ? Math.round((count / tests.length) * 100) : 0

                return (
                  <div key={catKey} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-ink">{label}</span>
                      <span className="font-mono text-ink-muted">
                        {count} modul ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-borderline/40 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-accent h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {Object.keys(categoryCounts).length === 0 && (
                <p className="text-xs text-ink-muted py-2">Belum ada kategori terdata.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
