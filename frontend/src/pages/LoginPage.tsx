import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Lock, Mail, ArrowRight, KeyRound, ShieldAlert, User as UserIcon, UserCheck } from 'lucide-react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (res: { credential?: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string
              size?: string
              width?: number
              text?: string
              shape?: string
            }
          ) => void
          prompt?: () => void
        }
      }
    }
  }
}

const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
)

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'creator' | 'user'>('creator')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login, register, loginWithGoogle, isAuthenticated, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const from = (location.state as { from?: string })?.from || '/admin'
  const reason = (location.state as { reason?: string })?.reason
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin' || user.role === 'creator') {
        navigate(from, { replace: true })
      } else {
        navigate('/my-subscriptions', { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate, from])

  // Google Identity Services (GIS) button initialization
  useEffect(() => {
    if (!googleClientId) return

    const initGsi = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return
            setLoading(true)
            setError(null)
            try {
              const ok = await loginWithGoogle(response.credential, role)
              if (ok) {
                toast.success('Login Berhasil', 'Autentikasi Google berhasil diverifikasi.')
                navigate(from, { replace: true })
              }
            } catch (err) {
              setError((err as Error).message || 'Gagal login dengan akun Google.')
            } finally {
              setLoading(false)
            }
          },
        })

        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            width: googleBtnRef.current.offsetWidth || 360,
            text: isRegister ? 'signup_with' : 'signin_with',
            shape: 'rectangular',
          })
        }
      } catch (err) {
        console.warn('Google Identity Services initialization warning:', err)
      }
    }

    if (window.google?.accounts?.id) {
      initGsi()
    } else {
      const scriptId = 'google-gsi-client'
      let script = document.getElementById(scriptId) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = initGsi
        document.body.appendChild(script)
      } else {
        script.addEventListener('load', initGsi)
      }
    }
  }, [googleClientId, isRegister, role, from, loginWithGoogle, navigate, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          setError('Nama lengkap wajib diisi.')
          setLoading(false)
          return
        }
        const ok = await register(email, password, fullName.trim(), role)
        if (ok) {
          toast.success('Pendaftaran Berhasil', `Selamat datang, ${fullName.trim()}! Akun Anda telah aktif.`)
          if (role === 'creator') {
            navigate('/admin', { replace: true })
          } else {
            navigate('/', { replace: true })
          }
        }
      } else {
        const ok = await login(email, password)
        if (ok) {
          toast.success('Login Berhasil', 'Autentikasi akun berhasil diverifikasi.')
          navigate(from, { replace: true })
        } else {
          setError('Kredensial login tidak valid. Pastikan email dan kata sandi benar.')
        }
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemo = async () => {
    setIsRegister(false)
    setEmail('admin@testhub.com')
    setPassword('AdminPassword123!')
    setError(null)
    setLoading(true)
    try {
      const ok = await login('admin@testhub.com', 'AdminPassword123!')
      if (ok) {
        toast.success('Mode Demo Aktif', 'Berhasil masuk sebagai Administrator.')
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
          <h2 className="text-xl font-bold text-ink">
            {isRegister ? 'Pendaftaran Akun Baru' : 'Login Portal TestHub'}
          </h2>
          <p className="text-xs text-ink-muted">
            {isRegister
              ? 'Daftarkan akun pengajar atau siswa untuk akses fitur penuh.'
              : 'Akses dashboard manajemen bank soal, penilaian esai, dan analitik.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 rounded-md bg-canvas border border-borderline text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false)
              setError(null)
            }}
            className={`py-1.5 rounded transition-colors ${
              !isRegister ? 'bg-surface text-ink shadow-xs border border-borderline/60' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true)
              setError(null)
            }}
            className={`py-1.5 rounded transition-colors ${
              isRegister ? 'bg-surface text-ink shadow-xs border border-borderline/60' : 'text-ink-muted hover:text-ink'
            }`}
          >
            Daftar Akun Baru
          </button>
        </div>

        {/* Role selection when registering */}
        {isRegister && (
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
              Tipe Akun (Role)
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRole('creator')}
                className={`p-2.5 rounded-md border text-left transition-colors flex items-center space-x-2 ${
                  role === 'creator'
                    ? 'border-accent bg-accent/10 text-accent font-semibold'
                    : 'border-borderline bg-canvas text-ink hover:bg-surface-hover'
                }`}
              >
                <UserCheck className="w-4 h-4 flex-shrink-0" />
                <span>Pengajar / Kreator</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('user')}
                className={`p-2.5 rounded-md border text-left transition-colors flex items-center space-x-2 ${
                  role === 'user'
                    ? 'border-accent bg-accent/10 text-accent font-semibold'
                    : 'border-borderline bg-canvas text-ink hover:bg-surface-hover'
                }`}
              >
                <UserIcon className="w-4 h-4 flex-shrink-0" />
                <span>Peserta / Siswa</span>
              </button>
            </div>
          </div>
        )}

        {/* Access Warning if redirected from protected route */}
        {reason === 'unauthenticated' && !error && !isRegister && (
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

        {/* Google OAuth Sign-In Option */}
        <div className="space-y-3">
          {googleClientId ? (
            <div ref={googleBtnRef} className="w-full flex justify-center min-h-[40px]" />
          ) : (
            <button
              type="button"
              onClick={() => {
                toast.info(
                  'Konfigurasi Google OAuth',
                  'Tambahkan VITE_GOOGLE_CLIENT_ID pada frontend/.env dan GOOGLE_CLIENT_ID pada backend/.env.'
                )
              }}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-md border border-borderline bg-canvas hover:bg-surface-hover text-ink text-xs font-semibold shadow-xs transition-colors flex items-center justify-center space-x-2"
            >
              <GoogleIcon />
              <span>{isRegister ? 'Daftar dengan Akun Google' : 'Masuk dengan Akun Google'}</span>
            </button>
          )}

          <div className="relative flex items-center justify-center text-xs">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-borderline"></div>
            </div>
            <span className="relative bg-surface px-2 text-[10px] uppercase tracking-wider text-ink-muted">
              atau lanjutkan dengan email
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Prof. John Doe"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
              Email Akun
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
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
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-95 shadow-xs transition-opacity flex items-center justify-center space-x-1.5"
          >
            <span>{loading ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk ke Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick Button */}
        {!isRegister && (
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
        )}
      </div>
    </div>
  )
}
