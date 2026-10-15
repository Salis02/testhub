import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { ScoreSummary } from '@/components/results/ScoreSummary'
import { CategoryBreakdown } from '@/components/results/CategoryBreakdown'
import { QuestionReviewList } from '@/components/results/QuestionReviewList'
import { ResultsPageSkeleton } from '@/components/common/Skeleton'
import { CertificateModal } from '@/components/common/CertificateModal'
import { LeaderboardModal } from '@/components/common/LeaderboardModal'
import { ArrowLeft, RotateCcw, Share2, Printer, Check, Award, Trophy } from 'lucide-react'

export const ResultsPage: React.FC = () => {
  const { resultId } = useParams<{ resultId: string }>()
  const [copied, setCopied] = useState(false)
  const [isCertModalOpen, setIsCertModalOpen] = useState(false)
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)

  const { data, isLoading: loading } = useQuery({
    queryKey: ['result', resultId],
    queryFn: () => (resultId ? api.getResult(resultId) : Promise.reject('ID hasil ujian tidak valid')),
    enabled: !!resultId,
    staleTime: 5 * 60 * 1000,
  })

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <ResultsPageSkeleton />
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <h2 className="text-xl font-semibold text-ink">Hasil Tidak Ditemukan</h2>
        <p className="text-xs text-ink-muted">
          Sesi ujian ini mungkin telah kedaluwarsa atau belum diselesaikan secara valid.
        </p>
        <Link
          to="/"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-md bg-accent text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Katalog Ujian</span>
        </Link>
      </div>
    )
  }

  const { result, questions } = data

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
        <Link
          to="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Katalog Ujian Lainnya</span>
        </Link>

        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          {result.passing && (
            <button
              onClick={() => setIsCertModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-accent/30 bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors shadow-xs"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Sertifikat Kelulusan</span>
            </button>
          )}
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-borderline bg-surface text-ink text-xs font-medium hover:bg-surface-hover transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Papan Peringkat</span>
          </button>
          <button
            onClick={handleShare}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-borderline bg-surface text-ink text-xs font-medium hover:bg-surface-hover transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tautan Disalin' : 'Bagikan Hasil'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-borderline bg-surface text-ink text-xs font-medium hover:bg-surface-hover transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Rekap</span>
          </button>
          <Link
            to={`/test/${result.test_id}`}
            className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Coba Ujian Lagi</span>
          </Link>
        </div>
      </div>

      {/* Score Summary Card */}
      <ScoreSummary result={result} />

      {/* Category Breakdown */}
      <CategoryBreakdown breakdown={result.category_breakdown} />

      {/* Review Mode (All questions + answers + explanations) */}
      <QuestionReviewList questions={questions} submissions={result.submissions} />

      {/* Official Certificate Modal */}
      {resultId && (
        <CertificateModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          resultId={resultId}
        />
      )}

      {/* Test Leaderboard Modal */}
      {result.test_id && (
        <LeaderboardModal
          isOpen={isLeaderboardOpen}
          onClose={() => setIsLeaderboardOpen(false)}
          testId={result.test_id}
        />
      )}
    </div>
  )
}
