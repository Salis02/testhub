import React, { useState, useMemo } from 'react'
import { Test } from '@/types'
import { CategoryBadge } from '@/components/common/Badge'
import {
  Plus,
  Trash2,
  Globe,
  Lock,
  Play,
  Pencil,
  BarChart3,
  Search,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Tag,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useConfirm } from '@/context/ConfirmContext'
import { useToast } from '@/context/ToastContext'

interface TestManagementProps {
  tests: Test[]
  onTogglePublish: (testId: string) => void
  onDeleteTest: (testId: string) => void
  onOpenCreateModal: () => void
  onEditTest: (testId: string) => void
  onViewAnalytics?: (test: Test) => void
}

export const TestManagement: React.FC<TestManagementProps> = ({
  tests,
  onTogglePublish,
  onDeleteTest,
  onOpenCreateModal,
  onEditTest,
  onViewAnalytics,
}) => {
  const { confirm } = useConfirm()
  const toast = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  const handleDelete = async (test: Test) => {
    const ok = await confirm({
      title: 'Hapus Modul Ujian?',
      message: `Modul "${test.title}" akan dihapus secara permanen dari bank soal. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      variant: 'danger',
    })
    if (ok) {
      onDeleteTest(test.id)
      toast.success('Modul Berhasil Dihapus', `"${test.title}" telah dihapus.`)
    }
  }

  // Filtered tests by search query
  const filteredTests = useMemo(() => {
    if (!searchQuery.trim()) return tests
    const query = searchQuery.toLowerCase()
    return tests.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
    )
  }, [tests, searchQuery])

  // Pagination calculation
  const totalItems = filteredTests.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = (safePage - 1) * pageSize
  const paginatedTests = filteredTests.slice(startIndex, startIndex + pageSize)

  const formatRupiah = (val?: number) => {
    if (!val || val <= 0) return 'Gratis'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  return (
    <div className="bg-surface border border-borderline rounded-lg shadow-sm overflow-hidden space-y-0">
      {/* Table Header Action Bar */}
      <div className="p-5 border-b border-borderline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-ink">Manajemen Bank Soal & Ujian</h3>
          <p className="text-xs text-ink-muted">
            Kelola status publikasi, biaya akses (paywall), acak soal, serta passing grade modul.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start sm:self-auto w-full sm:w-auto">
          {/* Quick Search in tests */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Cari modul ujian..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            onClick={onOpenCreateModal}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Ujian</span>
          </button>
        </div>
      </div>

      {/* Responsive Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-borderline bg-canvas text-[11px] font-semibold font-mono tracking-wider text-ink-muted uppercase">
              <th className="py-3 px-4">Nama Modul & Deskripsi</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4">Durasi & Butir</th>
              <th className="py-3 px-4">Biaya Akses</th>
              <th className="py-3 px-4">Passing</th>
              <th className="py-3 px-4">Pengaturan</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderline text-xs">
            {paginatedTests.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-ink-muted text-xs">
                  Tidak ada modul ujian yang cocok dengan pencarian &ldquo;{searchQuery}&rdquo;.
                </td>
              </tr>
            ) : (
              paginatedTests.map((test) => (
                <tr key={test.id} className="hover:bg-surface-hover/70 transition-colors">
                  <td className="py-4 px-4 max-w-xs sm:max-w-md">
                    <div className="font-medium text-ink text-sm truncate">{test.title}</div>
                    <div className="text-ink-muted text-[11px] truncate mt-0.5">{test.description}</div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <CategoryBadge category={test.category} />
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap font-mono text-ink">
                    <div>{test.duration_minutes} Menit</div>
                    <div className="text-[10px] text-ink-muted">{test.total_questions} Soal</div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap font-mono text-xs">
                    {test.price_idr && test.price_idr > 0 ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                        <Tag className="w-3 h-3" />
                        <span>{formatRupiah(test.price_idr)}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                        Gratis
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap font-mono text-ink">
                    {test.passing_score_percentage}%
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center space-x-1 text-[10px] font-mono text-ink-muted">
                      {test.shuffle_questions && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-surface border border-borderline text-ink"
                          title="Acak Urutan Soal Aktif"
                        >
                          Acak Soal
                        </span>
                      )}
                      {test.shuffle_answers && (
                        <span
                          className="px-1.5 py-0.5 rounded bg-surface border border-borderline text-ink"
                          title="Acak Opsi Jawaban Aktif"
                        >
                          Acak Opsi
                        </span>
                      )}
                      {!test.shuffle_questions && !test.shuffle_answers && (
                        <span>Urut Standar</span>
                      )}
                    </div>
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap">
                    {test.published ? (
                      <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <Globe className="w-3 h-3" />
                        <span>Publik</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-ink-muted bg-canvas px-2 py-0.5 rounded border border-borderline">
                        <Lock className="w-3 h-3" />
                        <span>Draf</span>
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 whitespace-nowrap text-right space-x-2">
                    {/* Edit Test & Questions */}
                    <button
                      onClick={() => onEditTest(test.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium border border-accent/40 bg-accent/5 text-accent hover:bg-accent/15 transition-colors"
                      title="Edit parameter modul dan butir soal"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Edit Soal</span>
                    </button>

                    {/* View Analytics */}
                    {onViewAnalytics && (
                      <button
                        type="button"
                        onClick={() => onViewAnalytics(test)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium border border-borderline bg-canvas text-ink hover:bg-surface-hover transition-colors"
                        title="Lihat performa & analitik pengerjaan"
                      >
                        <BarChart3 className="w-3 h-3 text-accent" />
                        <span>Analitik</span>
                      </button>
                    )}

                    {/* Start / Preview Test */}
                    <Link
                      to={`/test/${test.id}`}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium border border-borderline bg-canvas text-ink hover:bg-surface-hover transition-colors"
                      title="Uji coba tampilan peserta"
                    >
                      <Play className="w-3 h-3 text-accent" />
                      <span>Uji Coba</span>
                    </Link>

                    {/* Toggle publish button */}
                    <button
                      onClick={() => onTogglePublish(test.id)}
                      className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium border border-borderline bg-canvas text-ink hover:bg-surface-hover transition-colors"
                    >
                      {test.published ? 'Tarik Draf' : 'Publikasikan'}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDelete(test)}
                      className="inline-flex items-center p-1 rounded text-ink-muted hover:text-red-500 hover:bg-surface-hover transition-colors"
                      title="Hapus Modul"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-borderline flex items-center justify-between text-xs text-ink-muted">
          <span>
            Menampilkan <strong>{startIndex + 1}</strong> –{' '}
            <strong>{Math.min(startIndex + pageSize, totalItems)}</strong> dari{' '}
            <strong>{totalItems}</strong> modul ujian
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-borderline bg-canvas text-ink hover:bg-surface-hover disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <span className="font-mono font-semibold px-2 py-1 rounded bg-canvas border border-borderline text-ink">
              {safePage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-borderline bg-canvas text-ink hover:bg-surface-hover disabled:opacity-40 transition-colors"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
