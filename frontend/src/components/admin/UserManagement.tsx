import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserListItem } from '@/types'
import { adminApi } from '@/services/admin.api'
import { useDebounce } from '@/hooks/useDebounce'
import { Pagination } from '@/components/common/Pagination'
import { useToast } from '@/context/ToastContext'
import { useConfirm } from '@/context/ConfirmContext'
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  MoreVertical,
  Check,
  Calendar,
  CreditCard,
  Loader2,
} from 'lucide-react'

export const UserManagement: React.FC = () => {
  const toast = useToast()
  const { confirm } = useConfirm()
  const queryClient = useQueryClient()

  // Search & Filter state
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 250)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Role edit modal/popover state
  const [editingRoleUser, setEditingRoleUser] = useState<UserListItem | null>(null)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'creator' | 'user'>('user')

  // 1. Fetch Users List with Server-side Pagination & Filtering
  const offset = (currentPage - 1) * pageSize
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', 'users', debouncedSearch, roleFilter, statusFilter, currentPage, pageSize],
    queryFn: ({ signal }) =>
      adminApi.listUsers(
        {
          search: debouncedSearch.trim() || undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          limit: pageSize,
          offset,
        },
        signal
      ),
  })

  const users = data?.users || []
  const total = data?.total || 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  // 2. Mutations with cache invalidation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminApi.toggleUserStatus(userId, isActive),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      if (variables.isActive) {
        toast.success('Akun Diaktifkan', 'Akses akun pengguna telah dipulihkan kembali.')
      } else {
        toast.warning('Akun Ditangguhkan', 'Pengguna tidak dapat login selama status akun ditangguhkan.')
      }
    },
    onError: (err: Error) => {
      toast.error('Gagal Mengubah Status Akun', err.message)
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'creator' | 'user' }) =>
      adminApi.updateUserRole(userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setEditingRoleUser(null)
      toast.success(
        'Hak Akses Diperbarui',
        `Role pengguna berhasil diubah menjadi ${variables.role.toUpperCase()}.`
      )
    },
    onError: (err: Error) => {
      toast.error('Gagal Mengubah Role', err.message)
    },
  })

  const handleToggleStatus = async (user: UserListItem) => {
    const nextStatus = !user.is_active
    const ok = await confirm({
      title: nextStatus ? 'Aktifkan Akun Pengguna?' : 'Tangguhkan Akun Pengguna?',
      message: nextStatus
        ? `Pengguna "${user.full_name}" (${user.email}) akan diizinkan kembali mengakses sistem ujian dan materi.`
        : `Pengguna "${user.full_name}" (${user.email}) akan diblokir dari sistem dan sesi aktif akan dibatalkan.`,
      confirmText: nextStatus ? 'Ya, Aktifkan' : 'Ya, Tangguhkan',
      cancelText: 'Batal',
      variant: nextStatus ? 'info' : 'danger',
    })

    if (ok) {
      toggleStatusMutation.mutate({ userId: user.id, isActive: nextStatus })
    }
  }

  const handleOpenRoleModal = (user: UserListItem) => {
    setEditingRoleUser(user)
    setSelectedRole(user.role)
  }

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRoleUser) return

    if (selectedRole === editingRoleUser.role) {
      setEditingRoleUser(null)
      return
    }

    const ok = await confirm({
      title: 'Konfirmasi Perubahan Hak Akses',
      message: `Ubah kewenangan akun "${editingRoleUser.full_name}" dari ${editingRoleUser.role.toUpperCase()} menjadi ${selectedRole.toUpperCase()}?`,
      confirmText: 'Konfirmasi Ubah',
      cancelText: 'Batal',
      variant: selectedRole === 'admin' ? 'danger' : 'info',
    })

    if (ok) {
      updateRoleMutation.mutate({ userId: editingRoleUser.id, role: selectedRole })
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Shield className="w-3 h-3" />
            <span>ADMINISTRATOR</span>
          </span>
        )
      case 'creator':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <ShieldAlert className="w-3 h-3" />
            <span>KONTRIBUTOR</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono text-ink-muted bg-canvas border border-borderline">
            <span>PESERTA</span>
          </span>
        )
    }
  }

  const getTierBadge = (tier?: string) => {
    if (!tier || tier === 'none' || tier === 'free') {
      return (
        <span className="text-[11px] font-mono text-ink-muted">
          Standar / Gratis
        </span>
      )
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <CreditCard className="w-3 h-3" />
        <span className="capitalize">{tier.replace('_', ' ')}</span>
      </span>
    )
  }

  return (
    <div className="bg-surface border border-borderline rounded-lg shadow-xs overflow-hidden space-y-0">
      {/* Header & Filter Bar */}
      <div className="p-5 border-b border-borderline flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-accent" />
            <h3 className="text-base font-semibold text-ink">Manajemen Pengguna & Otoritas</h3>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Kelola hak akses role sistem, pantau paket aktif, serta moderasi status akun pengguna.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Cari nama atau email..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3 h-3 text-ink-muted hidden sm:inline" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="px-2.5 py-1.5 text-xs rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="creator">Kontributor / Creator</option>
              <option value="user">Peserta Ujian</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="px-2.5 py-1.5 text-xs rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="suspended">Ditangguhkan</option>
          </select>
        </div>
      </div>

      {/* Responsive Users Table */}
      <div className="overflow-x-auto relative">
        {isFetching && (
          <div className="absolute top-2 right-4 flex items-center space-x-1.5 text-[11px] font-mono text-ink-muted bg-surface/90 px-2 py-0.5 rounded border border-borderline">
            <Loader2 className="w-3 h-3 animate-spin text-accent" />
            <span>Menyinkronkan...</span>
          </div>
        )}

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-borderline bg-canvas text-[11px] font-semibold font-mono tracking-wider text-ink-muted uppercase">
              <th className="py-3 px-4">Pengguna</th>
              <th className="py-3 px-4">Hak Akses (Role)</th>
              <th className="py-3 px-4">Paket Langganan</th>
              <th className="py-3 px-4">Status Akun</th>
              <th className="py-3 px-4">Bergabung</th>
              <th className="py-3 px-4 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borderline text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-ink-muted">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-accent mb-2" />
                  <span>Memuat data pengguna...</span>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-ink-muted text-xs">
                  Tidak ada data pengguna yang cocok dengan kriteria pencarian / filter.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const initials = (user.full_name || user.email)
                  .substring(0, 2)
                  .toUpperCase()

                return (
                  <tr key={user.id} className="hover:bg-surface-hover/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold flex items-center justify-center text-xs flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-ink text-sm truncate">
                            {user.full_name || 'Tanpa Nama'}
                          </div>
                          <div className="text-ink-muted text-xs font-mono truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getTierBadge(user.subscription_tier)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className="group inline-flex items-center focus:outline-none focus:ring-1 focus:ring-accent rounded transition-transform active:scale-95"
                        title={
                          user.is_active
                            ? 'Akun Aktif. Klik untuk menangguhkan.'
                            : 'Akun Ditangguhkan. Klik untuk mengaktifkan.'
                        }
                      >
                        {user.is_active ? (
                          <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 group-hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/20 cursor-pointer transition-colors">
                            <UserCheck className="w-3 h-3" />
                            <span>Aktif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 font-mono text-[11px] text-rose-600 dark:text-rose-400 bg-rose-500/10 group-hover:bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/20 cursor-pointer transition-colors">
                            <UserX className="w-3 h-3" />
                            <span>Ditangguhkan</span>
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-ink-muted tabular-nums">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-ink-muted" />
                        <span>
                          {new Date(user.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenRoleModal(user)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-medium border border-borderline bg-canvas text-ink hover:bg-surface-hover transition-colors"
                        title="Ubah kewenangan akun pengguna"
                      >
                        <Shield className="w-3 h-3 text-accent" />
                        <span>Ubah Role</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                          user.is_active
                            ? 'border-borderline bg-canvas text-ink-muted hover:text-rose-600 hover:bg-rose-500/10'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                        }`}
                      >
                        {user.is_active ? 'Tangguhkan' : 'Aktifkan'}
                      </button>
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
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={total}
        pageSize={pageSize}
        pageSizeOptions={[10, 20, 50]}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize)
          setCurrentPage(1)
        }}
        className="p-4 border-t border-borderline"
      />

      {/* Edit Role Modal */}
      {editingRoleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-surface border border-borderline rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-borderline flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-accent" />
                <h4 className="text-sm font-semibold text-ink">Ubah Role Pengguna</h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingRoleUser(null)}
                className="text-xs text-ink-muted hover:text-ink"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-ink-muted mb-1">
                  Pengguna Terpilih:
                </label>
                <div className="p-3 rounded-lg bg-canvas border border-borderline">
                  <div className="font-semibold text-sm text-ink">{editingRoleUser.full_name}</div>
                  <div className="text-xs font-mono text-ink-muted">{editingRoleUser.email}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-ink-muted mb-2">
                  Tingkat Otoritas (Role):
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRole === 'user'
                        ? 'border-accent bg-accent/10 shadow-xs'
                        : 'border-borderline bg-canvas hover:bg-surface-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="user"
                      checked={selectedRole === 'user'}
                      onChange={() => setSelectedRole('user')}
                      className="mt-0.5 text-accent focus:ring-accent"
                    />
                    <div>
                      <div className="text-xs font-semibold text-ink">Peserta (User)</div>
                      <div className="text-[11px] text-ink-muted">
                        Akses standar mengikuti ujian simulasi tryout dan melihat hasil evaluasi.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRole === 'creator'
                        ? 'border-accent bg-accent/10 shadow-xs'
                        : 'border-borderline bg-canvas hover:bg-surface-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="creator"
                      checked={selectedRole === 'creator'}
                      onChange={() => setSelectedRole('creator')}
                      className="mt-0.5 text-accent focus:ring-accent"
                    />
                    <div>
                      <div className="text-xs font-semibold text-ink">Kontributor (Creator)</div>
                      <div className="text-[11px] text-ink-muted">
                        Dapat membuat bank soal, menyusun modul baru, dan menilai jawaban esai.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRole === 'admin'
                        ? 'border-accent bg-accent/10 shadow-xs'
                        : 'border-borderline bg-canvas hover:bg-surface-hover'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={selectedRole === 'admin'}
                      onChange={() => setSelectedRole('admin')}
                      className="mt-0.5 text-accent focus:ring-accent"
                    />
                    <div>
                      <div className="text-xs font-semibold text-ink">Administrator Penuh</div>
                      <div className="text-[11px] text-ink-muted">
                        Akses penuh konsol manajemen, otorisasi pengguna, serta konfigurasi monetisasi.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-borderline">
                <button
                  type="button"
                  onClick={() => setEditingRoleUser(null)}
                  className="px-3 py-1.5 rounded-md border border-borderline bg-canvas text-xs font-medium text-ink hover:bg-surface-hover"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateRoleMutation.isPending}
                  className="btn-press inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity disabled:opacity-50"
                >
                  {updateRoleMutation.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
