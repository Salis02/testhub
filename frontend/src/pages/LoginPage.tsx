import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Lock, Mail, ArrowRight, KeyRound } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@testhub.com')
  const [password, setPassword] = useState('AdminPassword123!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const ok = await login(email, password)
      if (ok) {
        navigate('/admin')
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
    const ok = await login('admin@testhub.com', 'AdminPassword123!')
    if (ok) {
      navigate('/admin')
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
                placeholder="admin@testhub.id"
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
        <div className="pt-4 border-t border-borderline">
          <button
            type="button"
            onClick={handleQuickDemo}
            className="w-full py-2 px-3 rounded-md border border-accent/40 bg-accent/5 text-accent text-xs font-semibold hover:bg-accent/10 transition-colors flex items-center justify-center space-x-1.5 font-mono"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>1-Klik Masuk Mode Demo Admin</span>
          </button>
        </div>
      </div>
    </div>
  )
}
