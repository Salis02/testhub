import React from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react'
import { Skeleton } from './Skeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('admin' | 'creator' | 'user')[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = ['admin', 'creator'],
}) => {
  const { user, isAuthenticated, isCheckingAuth, logout } = useAuth()
  const location = useLocation()

  // 1. While verifying session token with backend (GET /api/auth/me)
  if (isCheckingAuth) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent border-t-transparent animate-spin"></div>
        <div className="text-center space-y-1 font-mono text-xs text-ink-muted">
          <p className="font-semibold text-ink">Memverifikasi Otorisasi Pengguna...</p>
          <p>Memvalidasi token sesi dengan backend security gateway.</p>
        </div>
      </div>
    )
  }

  // 2. Unauthenticated: Redirect to login with intended location state
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname, reason: 'unauthenticated' }} replace />
  }

  // 3. Unauthorized role (e.g. regular student trying to access admin dashboard)
  if (allowedRoles && !allowedRoles.includes(user.role as 'admin' | 'creator' | 'user')) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-surface border border-red-500/30 rounded-lg p-8 shadow-sm text-center space-y-5">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">403 - Akses Dibatasi</h2>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Akun Anda (<span className="font-mono text-ink font-semibold">{user.email}</span>) memiliki peran{' '}
              <span className="font-mono uppercase text-accent font-semibold">{user.role}</span>. Halaman ini memerlukan hak akses Administrator atau Instruktur.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-md border border-borderline bg-canvas text-xs font-semibold text-ink hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Beranda</span>
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 transition-opacity"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Ganti Akun Admin</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
