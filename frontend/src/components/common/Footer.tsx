import React from 'react'
import { Link } from 'react-router-dom'
import { Shield, Zap, CheckCircle2, Cpu } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-borderline bg-canvas text-ink-muted text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-ink font-bold text-base">
              <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white text-xs font-bold">
                TH
              </div>
              <span>TestHub</span>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              SaaS platform ujian & asesmen berskala tinggi untuk persiapan CPNS, SBMPTN, IQ, dan rekrutmen institusi nasional.
            </p>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-ink-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All Systems Operational (99.5% Uptime)</span>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-ink text-xs uppercase tracking-wider mb-3">Kategori Ujian</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/?category=cpns" className="hover:text-ink transition-colors">
                  Seleksi CPNS / Kedinasan (SKD)
                </Link>
              </li>
              <li>
                <Link to="/?category=sbmptn" className="hover:text-ink transition-colors">
                  UTBK-SNBT Kemendikbudristek
                </Link>
              </li>
              <li>
                <Link to="/?category=iq" className="hover:text-ink transition-colors">
                  Raven Matrices IQ Assessment
                </Link>
              </li>
              <li>
                <Link to="/?category=custom" className="hover:text-ink transition-colors">
                  Core Values AKHLAK BUMN
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture */}
          <div>
            <h4 className="font-semibold text-ink text-xs uppercase tracking-wider mb-3">Arsitektur & Standar</h4>
            <ul className="space-y-2">
              <li className="flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-accent" />
                <span>Go Server + PostgreSQL Master</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-accent" />
                <span>Redis Session Caching (&lt;200ms)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-accent" />
                <span>Anti-Cheating Device Fingerprint</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                <span>Strict Tri-Color Cognitive-Calm</span>
              </li>
            </ul>
          </div>

          {/* Legal & Version */}
          <div>
            <h4 className="font-semibold text-ink text-xs uppercase tracking-wider mb-3">Informasi Sistem</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/pricing" className="hover:text-ink transition-colors">
                  Model Langganan & Lisensi
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-ink transition-colors">
                  Portal Pengajar & Verifikator
                </Link>
              </li>
              <li className="font-mono text-[11px] pt-1">
                Version: 1.0.0-prod (Oct 2026)
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-borderline flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-ink-muted">
          <div>
            &copy; 2026 TestHub SaaS Assessment Platform. All rights reserved.
          </div>
          <div className="flex items-center space-x-6">
            <span>Privasi & Keamanan Data</span>
            <span>Syarat Layanan</span>
            <span>SLA 99.5%</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
