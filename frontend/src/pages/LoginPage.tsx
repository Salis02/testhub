import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Lock, Mail, ArrowRight, KeyRound, ShieldAlert } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@testhub.com')
  const [password, setPassword] = useState('AdminPassword123!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: string })?.from || '/admin'
  const reason = (location.state as { reason?: string })?.reason

  useEffect(() => {
    if (isAuthenticated && user && (user.role === 'admin' || user.role === 'creator')) {
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, user, navigate, from])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const ok = await login(email, password)
      if (ok) {
        navigate(from, { replace: true })
      } else {
        setError('Kredensial login tidak valid. Pastikan email dan kata sandi benar.')
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemo = async () => {
    setEmail('admin@testhub.com')
    setPassword('AdminPassword123!')
    setError(null)
    setLoading(true)
    try {
      const ok = await login('admin@testhub.com', 'AdminPassword123!')
      if (ok) {
        navigate(from, { replace: true })
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-surface border border-borderline rounded-lg p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-md bg-accent flex items-center justify-center text-white mx-auto font-bold text-sm">
            TH
          </div>
          <h2 className="text-xl font-bold text-ink">Login Portal Pengajar</h2>
          <p className="text-xs text-ink-muted">
            Akses dashboard manajemen bank soal, penilaian esai, dan analitik.
          </p>
        </div>

        {/* Access Warning if redirected from protected route */}
        {reason === 'unauthenticated' && !error && (
          <div className="p-3.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Otorisasi Diperlukan</p>
              <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90 mt-0.5">
                Rute yang Anda tuju (<code className="font-mono">{from}</code>) dilindungi dan hanya dapat diakses oleh Administrator/Pengajar.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Email Pengajar
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@testhub.com"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity flex items-center justify-center space-x-1.5"
          >
            <span>{loading ? 'Memverifikasi...' : 'Masuk ke Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick Button */}
        <div className="pt-4 border-t border-borderline space-y-2 text-center">
          <p className="text-[11px] text-ink-muted">Akun Uji Coba Terdaftar di Database:</p>
          <button
            type="button"
            onClick={handleQuickDemo}
            disabled={loading}
            className="w-full py-2 px-3 rounded-md border border-accent/40 bg-accent/5 text-accent text-xs font-semibold hover:bg-accent/10 transition-colors flex items-center justify-center space-x-1.5 font-mono"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>1-Klik Masuk Mode Demo Admin (admin@testhub.com)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
