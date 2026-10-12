import React from 'react'
import { TestResult } from '@/types'
import { Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { CategoryBadge } from '@/components/common/Badge'

export const ScoreSummary: React.FC<{ result: TestResult }> = ({ result }) => {
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="bg-surface border border-borderline rounded-lg p-6 sm:p-8 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-borderline gap-4">
        <div>
          <div className="flex items-center space-x-2.5 mb-2">
            <CategoryBadge category={result.category} />
            <span className="text-xs text-ink-muted font-mono">
              Sesi: {result.session_id.substring(0, 16)}...
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-ink">
            {result.test_title}
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Selesai pada: {new Date(result.submitted_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Passing Status Badge */}
        <div className="self-start sm:self-center">
          {result.passing ? (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>MEMENUHI PASSING GRADE ({result.passing_score_percentage}%)</span>
            </div>
          ) : (
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 font-semibold text-sm">
              <XCircle className="w-4 h-4" />
              <span>BELUM MEMENUHI PASSING GRADE ({result.passing_score_percentage}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Metrics Grid (Strict Tri-Color display typography per style.md) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 pt-6">
        {/* Score */}
        <div className="p-4 rounded-md bg-canvas border border-borderline">
          <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">
            Skor Akhir
          </p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl sm:text-4xl font-bold font-mono text-accent tabular-nums">
              {result.percentage_score}
            </span>
            <span className="text-sm text-ink-muted">/ 100</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-2">
            Total Poin: {result.total_score}
          </p>
        </div>

        {/* Percentile Ranking (US-003) */}
        <div className="p-4 rounded-md bg-canvas border border-borderline">
          <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">
            Peringkat Persentil
          </p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl sm:text-4xl font-bold font-mono text-ink tabular-nums">
              Top {100 - result.percentile}%
            </span>
          </div>
          <p className="text-[11px] text-accent mt-2 flex items-center space-x-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Lebih tinggi dari {result.percentile}% peserta</span>
          </p>
        </div>

        {/* Accuracy */}
        <div className="p-4 rounded-md bg-canvas border border-borderline">
          <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">
            Akurasi Jawaban
          </p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-3xl sm:text-4xl font-bold font-mono text-ink tabular-nums">
              {result.questions_correct}
            </span>
            <span className="text-sm text-ink-muted">/ {result.total_questions} Benar</span>
          </div>
          <p className="text-[11px] text-ink-muted mt-2">
            Dijawab: {result.questions_answered} soal
          </p>
        </div>

        {/* Time Spent */}
        <div className="p-4 rounded-md bg-canvas border border-borderline">
          <p className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-1">
            Waktu Pengerjaan
          </p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-semibold font-mono text-ink tabular-nums">
              {formatSeconds(result.time_spent_seconds)}
            </span>
          </div>
          <p className="text-[11px] text-ink-muted mt-2 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Alokasi: {formatSeconds(result.duration_seconds)}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
