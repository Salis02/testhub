import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/context/ConfirmContext'
import { Sun, Moon, ShieldCheck, LogOut, Menu, X } from 'lucide-react'

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated, logout } = useAuth()
  const { confirm } = useConfirm()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const isConfirmed = await confirm({
      title: 'Konfirmasi Keluar',
      message: 'Anda yakin ingin keluar dari akun Anda?',
      confirmText: 'Ya, Keluar',
      cancelText: 'Batal',
      variant: 'danger',
    })
    if (isConfirmed) {
      await logout()
    }
  }

  // Close mobile menu whenever route changes
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  // Hide main header on active test session page for zero-distraction cognitive-calm experience
  if (location.pathname.startsWith('/test/')) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-borderline bg-canvas/95 backdrop-blur-md transition-colors">
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

          {/* Desktop Navigation Links */}
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
            {isAuthenticated && (
              <Link
                to="/my-subscriptions"
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  location.pathname === '/my-subscriptions'
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
                }`}
              >
                Langganan Saya
              </Link>
            )}
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
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Dark / Light Mode Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Ganti Tema"
            title="Ganti Tema (Light / Dark)"
            className="p-2 rounded-md border border-borderline bg-surface text-ink hover:bg-surface-hover transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-ink-muted" />}
          </button>

          {/* Auth button (Desktop) */}
          <div className="hidden sm:flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                <Link
                  to="/my-subscriptions"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-borderline bg-surface text-ink hover:bg-surface-hover transition-colors"
                >
                  <span>Akun & Langganan</span>
                </Link>
                <button
                  onClick={handleLogout}
                  title="Keluar Akun"
                  className="p-2 rounded-md border border-borderline bg-surface text-ink-muted hover:text-red-500 hover:bg-surface-hover transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-borderline bg-surface text-ink hover:bg-surface-hover transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                <span>Masuk / Daftar</span>
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu Navigasi Mobile"
            className="md:hidden p-2 rounded-md border border-borderline bg-surface text-ink hover:bg-surface-hover transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-down Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-borderline bg-canvas/95 backdrop-blur-md px-4 py-4 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1 text-sm font-medium">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-md transition-colors ${
                location.pathname === '/'
                  ? 'bg-accent text-white font-semibold'
                  : 'text-ink hover:bg-surface'
              }`}
            >
              Ujian Tersedia
            </Link>
            <Link
              to="/pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-md transition-colors ${
                location.pathname === '/pricing'
                  ? 'bg-accent text-white font-semibold'
                  : 'text-ink hover:bg-surface'
              }`}
            >
              Biaya & Paket
            </Link>
            {isAuthenticated && (
              <Link
                to="/my-subscriptions"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-md transition-colors ${
                  location.pathname === '/my-subscriptions'
                    ? 'bg-accent text-white font-semibold'
                    : 'text-ink hover:bg-surface'
                }`}
              >
                Langganan Saya
              </Link>
            )}
            <Link
              to="/admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`px-3 py-2 rounded-md transition-colors ${
                location.pathname.startsWith('/admin')
                  ? 'bg-accent text-white font-semibold'
                  : 'text-ink hover:bg-surface'
              }`}
            >
              Dashboard Pengajar
            </Link>
          </nav>

          <div className="pt-3 border-t border-borderline">
            {isAuthenticated ? (
              <div className="flex items-center justify-between">
                <Link
                  to="/my-subscriptions"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-medium text-ink hover:text-accent"
                >
                  Kelola Akun & Langganan
                </Link>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    handleLogout()
                  }}
                  className="inline-flex items-center space-x-1 text-xs text-red-500 hover:text-red-600 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center justify-center space-x-2 py-2 rounded-md bg-accent text-white text-xs font-semibold shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Masuk / Daftar Akun</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
