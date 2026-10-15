import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/services/admin.api'
import { Subscription, SubscriptionStatus, Test } from '@/types'
import { ManualGrantFormValues } from '@/schemas/subscription.schema'
import { ManualGrantModal } from '@/components/admin/ManualGrantModal'
import { ExtendSubscriptionModal } from '@/components/admin/ExtendSubscriptionModal'
import { Skeleton } from '@/components/common/Skeleton'
import { Pagination } from '@/components/common/Pagination'
import { EmptyState } from '@/components/common/EmptyState'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import { useDebounce } from '@/hooks/useDebounce'
import { formatDate } from '@/utils/formatters'
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CalendarPlus,
  Ban,
  PauseCircle,
  PlayCircle,
  RotateCw,
} from 'lucide-react'

interface SubscriptionManagementProps {
  tests: Test[]
  isLoadingTests?: boolean
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  tests,
  isLoadingTests = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false)
  const [selectedSubForExtend, setSelectedSubForExtend] = useState<Subscription | null>(null)

  const debouncedSearch = useDebounce(searchQuery, 350)
  const toast = useToast()
  const { confirm } = useConfirm()
  const queryClient = useQueryClient()

  // Reset to page 1 on filter/search change
  React.useEffect(() => {
    setPage(1)
  }, [statusFilter, debouncedSearch])

  // Query Subscriptions list via TanStack Query
  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'subscriptions', statusFilter, debouncedSearch, page, pageSize],
    queryFn: ({ signal }) =>
      adminApi.listSubscriptions(
        {
          status: statusFilter || undefined,
          search: debouncedSearch.trim() || undefined,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
        signal
      ),
  })

  // Mutation: Manual Grant
  const grantMutation = useMutation({
    mutationFn: (values: ManualGrantFormValues) => adminApi.manualGrantSubscription(values),
    onSuccess: (newSub) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
      toast.success(
        'Akses Manual Berhasil Diberikan',
        `Hak akses ${newSub.tier} untuk ${newSub.user_identifier} telah aktif.`
      )
    },
    onError: (err: Error) => {
      toast.error('Gagal Memberikan Akses', err.message)
    },
  })

  // Mutation: Update Status & Extend
  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      extendDays,
      notes,
    }: {
      id: string
      status: SubscriptionStatus
      extendDays?: number
      notes?: string
    }) =>
      adminApi.updateSubscriptionStatus(id, {
        status,
        extend_days: extendDays,
        admin_notes: notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
      toast.success('Pembaruan Berhasil', 'Status langganan pengguna telah diperbarui.')
    },
    onError: (err: Error) => {
      toast.error('Gagal Memperbarui', err.message)
    },
  })

  // Mutation: Revoke
  const revokeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.revokeSubscription(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscriptions'] })
      toast.success('Langganan Dicabut', 'Hak akses modul telah dinonaktifkan.')
    },
    onError: (err: Error) => {
      toast.error('Gagal Mencabut Akses', err.message)
    },
  })

  const handleToggleSuspend = async (sub: Subscription) => {
    const nextStatus: SubscriptionStatus = sub.status === 'active' ? 'suspended' : 'active'
    const actionText = nextStatus === 'suspended' ? 'Menangguhkan' : 'Mengaktifkan kembali'

    const ok = await confirm({
      title: `${actionText} Akses?`,
      message: `Apakah Anda yakin ingin mengubah status langganan ${sub.user_identifier} menjadi "${nextStatus}"?`,
      variant: nextStatus === 'suspended' ? 'warning' : 'primary',
      confirmText: actionText,
    })

    if (!ok) return

    updateStatusMutation.mutate({
      id: sub.id,
      status: nextStatus,
      notes: `Diubah menjadi ${nextStatus} oleh administrator`,
    })
  }

  const handleRevoke = async (sub: Subscription) => {
    const ok = await confirm({
      title: 'Cabut Hak Akses Langganan?',
      message: `Tindakan ini akan membatalkan hak akses ${sub.tier} milik ${sub.user_identifier} secara permanen. Lanjutkan?`,
      variant: 'danger',
      confirmText: 'Ya, Cabut Akses',
    })

    if (!ok) return

    revokeMutation.mutate({
      id: sub.id,
      reason: 'Dicabut secara manual oleh administrator',
    })
  }

  const handleExtendSubmit = async (extendDays: number, notes: string) => {
    if (!selectedSubForExtend) return
    await updateStatusMutation.mutateAsync({
      id: selectedSubForExtend.id,
      status: 'active',
      extendDays,
      notes,
    })
  }

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Aktif</span>
          </span>
        )
      case 'suspended':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>Ditangguhkan</span>
          </span>
        )
      case 'revoked':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>Dicabut</span>
          </span>
        )
    }
  }

  const formatValidUntil = (validUntil?: string | null) => {
    if (!validUntil) return 'Akses Permanen'
    const date = new Date(validUntil)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 3600 * 24))

    const dateStr = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

    if (diffDays < 0) {
      return `${dateStr} (Kadaluarsa)`
    }
    return `${dateStr} (${diffDays} hari lagi)`
  }

  const subscriptions = data?.subscriptions || []

  return (
    <div className="space-y-6">
      {/* Action Bar Header */}
      <div className="bg-surface border border-borderline rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-ink">Manajemen Langganan & Hak Akses</h3>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            Kelola akses paywall peserta, pantau transaksi gateway, dan berikan akses manual B2B/offline.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-md border border-borderline bg-canvas text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
            title="Segarkan data"
          >
            <RotateCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-accent' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsGrantModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Beri Akses Manual</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari email peserta atau ID langganan..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-borderline bg-canvas text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="sm:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
          >
            <option value="">Semua Status Akses</option>
            <option value="active">Hanya Aktif</option>
            <option value="suspended">Hanya Ditangguhkan</option>
            <option value="revoked">Hanya Dicabut</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface border border-borderline rounded-lg overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
            <Skeleton className="h-14 w-full rounded" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<CreditCard className="w-6 h-6" />}
              title="Tidak ada data langganan"
              description={
                debouncedSearch || statusFilter
                  ? 'Tidak ditemukan data langganan yang cocok dengan kata kunci atau filter saat ini.'
                  : 'Belum ada data langganan. Klik "Beri Akses Manual" untuk menambahkan data pertama.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-borderline bg-canvas/50 text-[11px] font-semibold text-ink-muted uppercase tracking-wider font-mono">
                  <th className="py-3 px-4">Pengguna / Identitas</th>
                  <th className="py-3 px-4">Paket & Modul</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Masa Aktif</th>
                  <th className="py-3 px-4">Sumber & Audit</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderline">
                {subscriptions.map((sub) => {
                  const targetTest = tests.find((t) => t.id === sub.test_id)
                  const isPerTest = sub.tier === 'per_test'

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-canvas/50 transition-colors group"
                    >
                      {/* User Identifier */}
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        <div>{sub.user_identifier}</div>
                        <div className="text-[10px] text-ink-muted">{sub.id}</div>
                      </td>

                      {/* Tier & Target Test */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">
                          {isPerTest ? 'Per-Modul Tryout' : 'Season Pass (90 Hari)'}
                        </div>
                        {isPerTest && (
                          <div className="text-[11px] text-ink-muted truncate max-w-xs" title={targetTest?.title || sub.test_id || ''}>
                            {targetTest ? `[${targetTest.category.toUpperCase()}] ${targetTest.title}` : `Test: ${sub.test_id}`}
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        {getStatusBadge(sub.status)}
                      </td>

                      {/* Valid Until */}
                      <td className="py-3 px-4 font-mono text-ink-muted">
                        {formatValidUntil(sub.valid_until)}
                      </td>

                      {/* Source & Notes */}
                      <td className="py-3 px-4 max-w-xs">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono border bg-surface border-borderline text-ink-muted mb-0.5">
                          {sub.source === 'admin_manual' ? 'Admin Manual' : 'Gateway QRIS'}
                        </span>
                        {sub.admin_notes && (
                          <p className="text-[11px] text-ink-muted truncate" title={sub.admin_notes}>
                            {sub.admin_notes}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5 opacity-90 group-hover:opacity-100">
                          {/* Extend Days */}
                          <button
                            type="button"
                            onClick={() => setSelectedSubForExtend(sub)}
                            className="p-1.5 rounded hover:bg-surface-hover text-ink-muted hover:text-accent transition-colors"
                            title="Perpanjang hari"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Suspend */}
                          {sub.status !== 'revoked' && (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspend(sub)}
                              className="p-1.5 rounded hover:bg-surface-hover text-ink-muted hover:text-amber-500 transition-colors"
                              title={sub.status === 'active' ? 'Tangguhkan akses' : 'Aktifkan kembali'}
                            >
                              {sub.status === 'active' ? (
                                <PauseCircle className="w-3.5 h-3.5" />
                              ) : (
                                <PlayCircle className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Revoke */}
                          {sub.status !== 'revoked' && (
                            <button
                              type="button"
                              onClick={() => handleRevoke(sub)}
                              className="p-1.5 rounded hover:bg-surface-hover text-ink-muted hover:text-rose-500 transition-colors"
                              title="Cabut akses"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Centered Pagination Controls */}
        <div className="border-t border-borderline px-4 bg-canvas/30">
          <Pagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil((data?.total || 0) / pageSize))}
            totalItems={data?.total || 0}
            pageSize={pageSize}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <ManualGrantModal
        isOpen={isGrantModalOpen}
        onClose={() => setIsGrantModalOpen(false)}
        onSubmit={async (values) => {
          await grantMutation.mutateAsync(values)
        }}
        tests={tests}
        isLoadingTests={isLoadingTests}
      />

      <ExtendSubscriptionModal
        isOpen={!!selectedSubForExtend}
        onClose={() => setSelectedSubForExtend(null)}
        subscription={selectedSubForExtend}
        onSubmit={handleExtendSubmit}
      />
    </div>
  )
}
