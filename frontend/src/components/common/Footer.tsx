import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export const Footer: React.FC = () => {
  const location = useLocation()

  // Sembunyikan footer di halaman ujian aktif untuk eliminasi distraksi visual
  if (location.pathname.startsWith('/test/')) {
    return null
  }

  return (
    <footer className="mt-auto border-t border-borderline bg-canvas text-ink-muted text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-borderline">
          {/* Brand Info */}
          <div className="space-y-1.5 max-w-sm">
            <div className="flex items-center space-x-2 text-ink font-bold text-sm">
              <div className="w-5 h-5 rounded bg-accent flex items-center justify-center text-white text-[10px] font-bold">
                TH
              </div>
              <span>TestHub</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Platform simulasi tryout dan asesmen resmi (CPNS, SBMPTN, IQ, dan BUMN) dengan evaluasi akurat dan instan.
            </p>
          </div>

          {/* Quick Links */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium">
            <Link to="/?category=all" className="hover:text-ink transition-colors">
              Katalog Ujian
            </Link>
            <Link to="/pricing" className="hover:text-ink transition-colors">
              Biaya & Paket
            </Link>
            <Link to="/login" className="hover:text-ink transition-colors">
              Portal Pengajar
            </Link>
            <Link to="/verify/certificate/sample" className="hover:text-ink transition-colors">
              Verifikasi Sertifikat
            </Link>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-ink-muted font-mono">
          <div>
            &copy; {new Date().getFullYear()} TestHub Assessment Cloud. Hak Cipta Dilindungi.
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Sistem Operasional (99.5% SLA)</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
