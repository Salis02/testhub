import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { Sun, Moon, ShieldCheck, LogOut } from 'lucide-react'

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated, logout } = useAuth()
  const location = useLocation()

  // Hide main header on active test session page for zero-distraction cognitive-calm experience
  if (location.pathname.startsWith('/test/')) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-borderline bg-canvas/90 backdrop-blur-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2.5 text-ink hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white font-bold text-base shadow-sm">
              TH
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight leading-none text-ink">
                Test<span className="text-accent">Hub</span>
              </span>
              <span className="text-[10px] text-ink-muted tracking-wider uppercase font-mono mt-0.5">
                Assessment SaaS
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === '/'
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
              }`}
            >
              Ujian Tersedia
            </Link>
            <Link
              to="/pricing"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === '/pricing'
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
              }`}
            >
              Biaya & Paket
            </Link>
            <Link
              to="/admin"
              className={`px-3 py-1.5 rounded-md transition-colors ${
                location.pathname.startsWith('/admin')
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
              }`}
            >
              Dashboard Pengajar
            </Link>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Performance tag */}
          <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-surface border border-borderline text-[11px] font-mono text-ink-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>p95 &lt; 200ms</span>
          </div>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Ganti Tema"
            title="Ganti Tema (Light / Dark)"
            className="p-2 rounded-md border border-borderline bg-surface text-ink hover:bg-surface-hover transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-ink-muted" />}
          </button>

          {/* Admin Auth quick button */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-white hover:opacity-90 transition-opacity"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
              <button
                onClick={logout}
                title="Keluar Akun Admin"
                className="p-2 rounded-md border border-borderline bg-surface text-ink-muted hover:text-red-500 hover:bg-surface-hover transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-borderline bg-surface text-ink hover:bg-surface-hover transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Login Admin</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
