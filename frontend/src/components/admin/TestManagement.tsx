import React from 'react'
import { Test } from '@/types'
import { CategoryBadge } from '@/components/common/Badge'
import { Plus, Trash2, Globe, Lock, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

interface TestManagementProps {
  tests: Test[]
  onTogglePublish: (testId: string) => void
  onDeleteTest: (testId: string) => void
  onOpenCreateModal: () => void
}

export const TestManagement: React.FC<TestManagementProps> = ({
  tests,
  onTogglePublish,
  onDeleteTest,
  onOpenCreateModal,
}) => {
  return (
    <div className="bg-surface border border-borderline rounded-lg shadow-sm overflow-hidden">
      {/* Table Header Action Bar */}
      <div className="p-5 border-b border-borderline flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-ink">Manajemen Bank Soal & Ujian</h3>
          <p className="text-xs text-ink-muted">
            Kelola status publikasi, durasi waktu, dan kriteria passing grade untuk peserta.
          </p>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Ujian Baru</span>
        </button>
      </div>

      {/* Responsive Data Table strictly following style.md Section 4.3 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-borderline bg-canvas text-[11px] font-semibold font-mono tracking-wider text-ink-muted uppercase">
              <th className="py-3 px-4">Nama Modul & Deskripsi</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4">Durasi</th>
              <th className="py-3 px-4">Passing Grade</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderline text-xs">
            {tests.map((test) => (
              <tr key={test.id} className="hover:bg-surface-hover/70 transition-colors">
                <td className="py-4 px-4 max-w-xs sm:max-w-md">
                  <div className="font-medium text-ink text-sm truncate">{test.title}</div>
                  <div className="text-ink-muted text-[11px] truncate mt-0.5">{test.description}</div>
                </td>
                <td className="py-4 px-4 whitespace-nowrap">
                  <CategoryBadge category={test.category} />
                </td>
                <td className="py-4 px-4 whitespace-nowrap font-mono text-ink">
                  {test.duration_minutes} Menit
                </td>
                <td className="py-4 px-4 whitespace-nowrap font-mono text-ink">
                  {test.passing_score_percentage}%
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
                    onClick={() => {
                      if (confirm(`Hapus modul "${test.title}"?`)) {
                        onDeleteTest(test.id)
                      }
                    }}
                    className="inline-flex items-center p-1 rounded text-ink-muted hover:text-red-500 hover:bg-surface-hover transition-colors"
                    title="Hapus Modul"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
