import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AdminAuditLog } from '@/types'
import { adminApi } from '@/services/admin.api'
import { useDebounce } from '@/hooks/useDebounce'
import { Pagination } from '@/components/common/Pagination'
import {
  FileClock,
  Search,
  Filter,
  RefreshCw,
  Shield,
  Activity,
  Globe,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
} from 'lucide-react'

export const AuditLogView: React.FC = () => {
  // Search & Filter state
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 250)
  const [resourceFilter, setResourceFilter] = useState<string>('all')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Fetch Audit Logs with TanStack Query
  const { data: logs = [], isLoading, isFetching, refetch } = useQuery<AdminAuditLog[]>({
    queryKey: ['admin', 'audit-logs'],
    queryFn: ({ signal }) => adminApi.getAuditLogs({ limit: 100, offset: 0 }, signal),
  })

  // Filter logs by search input and resource type
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Resource filter
      if (resourceFilter !== 'all' && log.resource_type.toLowerCase() !== resourceFilter.toLowerCase()) {
        return false
      }

      // Search filter
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.toLowerCase()
        const matchAction = log.action.toLowerCase().includes(query)
        const matchResource = log.resource_type.toLowerCase().includes(query)
        const matchAdmin = (log.admin_email || '').toLowerCase().includes(query)
        const matchIp = (log.ip_address || '').toLowerCase().includes(query)
        const matchNewVal = (log.new_value || '').toLowerCase().includes(query)
        if (!matchAction && !matchResource && !matchAdmin && !matchIp && !matchNewVal) {
          return false
        }
      }

      return true
    })
  }, [logs, debouncedSearch, resourceFilter])

  // Pagination calculation
  const totalItems = filteredLogs.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = (safePage - 1) * pageSize
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize)

  const getActionBadge = (action: string) => {
    const act = action.toLowerCase()
    if (act.includes('delete') || act.includes('revoke') || act.includes('suspend')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <Trash2 className="w-3 h-3" />
          <span className="uppercase">{action.replace('_', ' ')}</span>
        </span>
      )
    }
    if (act.includes('create') || act.includes('grant') || act.includes('publish')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="w-3 h-3" />
          <span className="uppercase">{action.replace('_', ' ')}</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
        <Activity className="w-3 h-3" />
        <span className="uppercase">{action.replace('_', ' ')}</span>
      </span>
    )
  }

  const getResourceBadge = (resource: string) => {
    return (
      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-canvas border border-borderline text-ink-muted">
        <Layers className="w-2.5 h-2.5" />
        <span>{resource}</span>
      </span>
    )
  }

  return (
    <div className="bg-surface border border-borderline rounded-lg shadow-xs overflow-hidden space-y-0">
      {/* Header & Filter Bar */}
      <div className="p-5 border-b border-borderline flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileClock className="w-4 h-4 text-accent" />
            <h3 className="text-base font-semibold text-ink">Jejak Audit & Log Keamanan</h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Rekam jejak kepatuhan, histori moderasi konten, perubahan otorisasi, dan aktivitas administrator.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Cari aksi, admin, atau detail..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Resource Filter */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3 h-3 text-ink-muted hidden sm:inline" />
            <select
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 text-xs rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">Semua Entitas</option>
              <option value="test">Modul Ujian (Test)</option>
              <option value="user">Pengguna (User)</option>
              <option value="subscription">Langganan</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-borderline bg-canvas text-ink hover:bg-surface-hover text-xs font-medium transition-colors"
            title="Muat ulang jejak audit terbaru"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-accent' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Responsive Audit Table */}
      <div className="overflow-x-auto relative">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-borderline bg-canvas text-[11px] font-semibold font-mono tracking-wider text-ink-muted uppercase">
              <th className="py-3 px-4">Waktu & IP Address</th>
              <th className="py-3 px-4">Administrator</th>
              <th className="py-3 px-4">Aktivitas (Action)</th>
              <th className="py-3 px-4">Entitas Target</th>
              <th className="py-3 px-4">Detail Perubahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderline text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-ink-muted">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-accent mb-2" />
                  <span>Memuat catatan audit log...</span>
                </td>
              </tr>
            ) : paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-ink-muted text-xs">
                  Tidak ada catatan audit log yang cocok dengan filter pencarian.
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => {
                const date = new Date(log.created_at)
                return (
                  <tr key={log.id} className="hover:bg-surface-hover/70 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                      <div className="text-ink font-medium tabular-nums">
                        {date.toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        {date.toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                      <div className="text-[10px] text-ink-muted flex items-center space-x-1 mt-0.5">
                        <Globe className="w-2.5 h-2.5" />
                        <span>{log.ip_address || 'Internal System'}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent/20 text-accent flex items-center justify-center text-[10px] font-semibold">
                          <Shield className="w-3 h-3" />
                        </div>
                        <div className="font-mono text-xs text-ink truncate max-w-[180px]">
                          {log.admin_email || 'System / Auto'}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        {getResourceBadge(log.resource_type)}
                        {log.resource_id && (
                          <div className="text-[10px] font-mono text-ink-muted truncate max-w-[140px]" title={log.resource_id}>
                            ID: {log.resource_id.substring(0, 12)}...
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {log.new_value || log.old_value ? (
                        <div className="space-y-1 text-[11px] font-mono">
                          {log.old_value && (
                            <div className="text-ink-muted truncate max-w-xs sm:max-w-md">
                              <span className="text-rose-500 font-semibold">- Lama:</span> {log.old_value}
                            </div>
                          )}
                          {log.new_value && (
                            <div className="text-ink truncate max-w-xs sm:max-w-md">
                              <span className="text-emerald-500 font-semibold">+ Baru:</span> {log.new_value}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-ink-muted text-[11px] italic">Tidak ada payload tambahan</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Shared Pagination Component */}
      <Pagination
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        pageSizeOptions={[15, 30, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize)
          setCurrentPage(1)
        }}
        className="p-4 border-t border-borderline"
      />
    </div>
  )
}
