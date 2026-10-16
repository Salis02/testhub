import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { Trophy, Medal, Clock, Award, X, Loader2, UserCheck, Flame } from 'lucide-react'
import { testsApi } from '@/services/tests.api'
import { LeaderboardTableSkeleton } from '@/components/common/Skeleton'

interface LeaderboardModalProps {
  isOpen: boolean
  onClose: () => void
  testId: string
  testTitle?: string
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  testId,
  testTitle,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['leaderboard', testId],
    queryFn: ({ signal }) => testsApi.getLeaderboard(testId, signal),
    enabled: isOpen && !!testId,
  })

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  const leaderboard = data?.leaderboard || []

  // Mask email for privacy (e.g. "po***@kkafa.com" or "user_891...")
  const maskIdentifier = (ident: string) => {
    if (!ident) return 'Peserta Anonim'
    if (ident.includes('@')) {
      const [name, domain] = ident.split('@')
      if (name.length <= 2) return `${name}***@${domain}`
      return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`
    }
    if (ident.length > 8) {
      return `${ident.slice(0, 4)}...${ident.slice(-3)}`
    }
    return ident
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs.toString().padStart(2, '0')}s`
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
            <Trophy className="w-3.5 h-3.5" />
          </div>
        )
      case 2:
        return (
          <div className="w-7 h-7 rounded-full bg-slate-300/25 border border-slate-400/30 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
            <Medal className="w-3.5 h-3.5" />
          </div>
        )
      case 3:
        return (
          <div className="w-7 h-7 rounded-full bg-amber-700/15 border border-amber-700/30 text-amber-700 dark:text-amber-500 flex items-center justify-center font-bold text-xs">
            <Medal className="w-3.5 h-3.5" />
          </div>
        )
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-surface border border-borderline text-ink-muted flex items-center justify-center font-mono text-xs font-semibold">
            {rank}
          </div>
        )
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 dark:bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-xl w-full p-6 shadow-2xl space-y-5 my-auto transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Papan Peringkat Peserta</h3>
              <p className="text-xs text-ink-muted line-clamp-1">
                {testTitle || 'Modul Ujian Terstandar'}
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
          <div className="py-2">
            <LeaderboardTableSkeleton />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-red-500">
            Gagal memuat papan peringkat. Silakan coba lagi.
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto mb-3">
              <Flame className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-ink">Belum ada peserta yang menyelesaikan ujian ini.</p>
            <p className="text-xs text-ink-muted">Jadilah yang pertama menyelesaikan modul dan raih peringkat teratas!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-ink-muted px-2">
              <span>Total Peserta: <strong className="text-ink">{data?.total || leaderboard.length}</strong></span>
              <span>Diurutkan berdasarkan skor & kecepatan pengerjaan</span>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-1 divide-y divide-borderline/50">
              {leaderboard.map((entry) => (
                <div
                  key={entry.session_id}
                  className={`pt-2.5 pb-2.5 px-3 rounded-md flex items-center justify-between transition-colors ${entry.rank === 1
                      ? 'bg-amber-500/5 border border-amber-500/20'
                      : 'hover:bg-surface-hover'
                    }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {getRankBadge(entry.rank)}
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-medium text-ink truncate">
                          {maskIdentifier(entry.user_identifier)}
                        </span>
                        {entry.rank <= 3 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">
                            Top {entry.rank}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-ink-muted">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(entry.time_spent_seconds)}</span>
                        </span>
                        <span>•</span>
                        <span>{new Date(entry.submitted_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-3">
                    <span className="text-base font-semibold font-mono tabular-nums text-accent">
                      {entry.percentage_score.toFixed(1)}%
                    </span>
                    <p className="text-[10px] text-ink-muted font-mono">Skor {entry.score.toFixed(0)}</p>
                  </div>
                </div>
              ))}
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
    </div>,
    document.body
  )

}
