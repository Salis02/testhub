import React from 'react'
import { TestResult } from '@/types'
import { Clock, CheckCircle2, XCircle, TrendingUp, Sparkles, Target, Compass, HeartHandshake } from 'lucide-react'
import { CategoryBadge } from '@/components/common/Badge'

export const ScoreSummary: React.FC<{ result: TestResult }> = ({ result }) => {
  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s}s`
  }

  // Find category with lowest accuracy for actionable growth recommendation
  const breakdownList = Array.isArray(result.category_breakdown) ? result.category_breakdown : []
  const lowestCategory = breakdownList.length > 0
    ? [...breakdownList].sort((a, b) => (a.percentage || 0) - (b.percentage || 0))[0]
    : null

  const isPassing = result.passing
  const scoreGap = Math.max(0, Math.round(result.passing_score_percentage - result.percentage_score))

  return (
    <div className="bg-surface border border-borderline rounded-lg p-6 sm:p-8 shadow-sm transition-colors space-y-6">
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
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-semibold text-sm">
              <XCircle className="w-4 h-4" />
              <span>EVALUASI PASSING GRADE ({result.passing_score_percentage}%)</span>
            </div>
          )}
        </div>
      </div>

      {/* Primary Metrics Grid (Strict Tri-Color display typography per style.md) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
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

      {/* Empathetic Growth Coach & Camaraderie Section (Behavioral Psychology) */}
      <div className={`p-4 sm:p-5 rounded-lg border transition-all ${
        isPassing
          ? 'bg-emerald-500/5 border-emerald-500/25'
          : 'bg-accent/5 border-accent/20'
      }`}>
        <div className="flex items-start space-x-3.5">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isPassing
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-accent/15 text-accent'
          }`}>
            {isPassing ? <Sparkles className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-ink flex items-center space-x-2">
                <span>Catatan Refleksi & Bimbingan Pejuang</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-borderline text-ink-muted">
                  TestHub Coach
                </span>
              </h4>
            </div>

            <p className="text-xs sm:text-sm text-ink/90 leading-relaxed">
              {isPassing ? (
                <>
                  <strong className="text-emerald-600 dark:text-emerald-400">Kerja keras luar biasa!</strong> Kamu berhasil melampaui ambang batas passing grade nasional dengan performa meyakinkan ({result.percentage_score}%). Namun ingat, ujian seleksi sesungguhnya menuntut stamina psikologis yang stabil. Tetap jaga ritme latihan harian dan pertahankan ketelitianmu.
                </>
              ) : (
                <>
                  <strong className="text-accent">Jangan berkecil hati.</strong> Hasil tryout ini adalah <em className="italic">peta evaluasi berharga</em>, bukan vonis kemampuanmu. Kamu hanya terpaut <strong>~{scoreGap}%</strong> dari batas kelulusan. Sebagian besar peserta sukses berawal dari simulasi pertama seperti ini. Kuncinya adalah menambal lubang konsep satu per satu hari ini.
                </>
              )}
            </p>

            {lowestCategory && (
              <div className="flex items-center space-x-2 pt-1 text-xs text-ink-muted font-mono">
                <Target className="w-3.5 h-3.5 text-accent" />
                <span>
                  Prioritas Latihan Berikutnya:{' '}
                  <strong className="text-ink underline decoration-accent/40">
                    {lowestCategory.category_name}
                  </strong>{' '}
                  (Akurasi saat ini: {Math.round(lowestCategory.percentage || 0)}%)
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-borderline/50 flex items-center space-x-2 text-[11px] text-ink-muted">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span>
                Kamu tidak berjuang sendirian. Ribuan pejuang lain di seluruh Indonesia juga sedang mengasah ikhtiar di jam yang sama.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
