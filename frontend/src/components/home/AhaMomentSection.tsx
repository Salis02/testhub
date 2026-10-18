import React, { useState } from 'react'
import {
  Radar,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  ChevronRight,
  BarChart3,
  Sparkles,
} from 'lucide-react'

export const AhaMomentSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'radar' | 'percentile' | 'certificate'>('radar')

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-surface surface-card border border-borderline rounded-2xl p-6 sm:p-10 shadow-card space-y-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-accent/20 bg-accent-tint text-accent text-xs font-mono font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The &ldquo;Aha!&rdquo; Moment Evaluasi Mandiri</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            Lebih dari Sekadar Skor: Ketahui Anatomi Kemampuan Anda
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Diagnostik menyeluruh pasca-ujian membantu Anda mengalokasikan jam belajar hanya pada materi yang paling mendesak untuk diperbaiki.
          </p>
        </div>

        {/* Feature Navigation Pills */}
        <div className="flex justify-center">
          <div className="inline-flex p-1 rounded-xl bg-canvas border border-borderline max-w-full overflow-x-auto shadow-subtle gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('radar')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium btn-press focus-ring transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'radar'
                  ? 'bg-surface text-accent shadow-xs font-semibold border border-borderline'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Radar className="w-4 h-4 text-accent" />
              <span>1. Peta Radar Kelemahan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('percentile')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium btn-press focus-ring transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'percentile'
                  ? 'bg-surface text-accent shadow-xs font-semibold border border-borderline'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>2. Persentil Ranking Nasional</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('certificate')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium btn-press focus-ring transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'certificate'
                  ? 'bg-surface text-accent shadow-xs font-semibold border border-borderline'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Award className="w-4 h-4 text-warning" />
              <span>3. Sertifikat Terverifikasi QR</span>
            </button>
          </div>
        </div>

        {/* Interactive Showcase Box */}
        <div className="bg-canvas border border-borderline rounded-xl p-5 sm:p-8 transition-all">
          {activeTab === 'radar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="text-[11px] font-mono text-accent uppercase font-bold tracking-wider">
                  Analisis Diagnostik Per Topik
                </span>
                <h3 className="text-xl font-bold text-ink">
                  Tahu Persis di Materi Apa Nilai Anda Bocor
                </h3>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Bukan hanya nilai akhir 410, sistem memetakan persentase akurasi setiap sub-bidang. Anda langsung tahu bahwa <strong className="text-ink">Silogisme & Penalaran Analitis</strong> membutuhkan penguatan sebelum hari H seleksi resmi.
                </p>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start space-x-2 text-xs text-ink">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Rekomendasi materi remedial otomatis dari AI Agent</span>
                  </div>
                  <div className="flex items-start space-x-2 text-xs text-ink">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Pembahasan langkah-demi-langkah per butir pertanyaan</span>
                  </div>
                </div>
              </div>

              {/* Visual Radar Mockup */}
              <div className="lg:col-span-6 bg-surface border border-borderline rounded-lg p-5 space-y-4 shadow-subtle">
                <div className="flex items-center justify-between border-b border-borderline pb-3">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-accent" />
                    <span className="text-xs font-semibold text-ink">Akurasi Topik SKD CPNS</span>
                  </div>
                  <span className="text-[11px] font-mono text-ink-muted">Sesi Terakhir</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink font-medium">Tes Wawasan Kebangsaan (TWK)</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">88% (Mantap)</span>
                    </div>
                    <div className="h-2 w-full bg-canvas rounded-full overflow-hidden border border-borderline">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '88%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink font-medium">TIU: Silogisme & Logika Posisi</span>
                      <span className="font-mono text-rose-500 font-bold">42% (Perlu Review)</span>
                    </div>
                    <div className="h-2 w-full bg-canvas rounded-full overflow-hidden border border-borderline">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: '42%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink font-medium">TIU: Penalaran Numerik & Pola Deret</span>
                      <span className="font-mono text-accent font-bold">76% (Aman)</span>
                    </div>
                    <div className="h-2 w-full bg-canvas rounded-full overflow-hidden border border-borderline">
                      <div className="h-full bg-accent rounded-full" style={{ width: '76%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-ink font-medium">Karakteristik Pribadi (TKP / AKHLAK)</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">92% (Sangat Baik)</span>
                    </div>
                    <div className="h-2 w-full bg-canvas rounded-full overflow-hidden border border-borderline">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-md flex items-center space-x-2 text-[11px] text-amber-700 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Prioritas: Naikkan silogisme +20% untuk menjamin peringkat 1 formasi instansi.</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'percentile' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">
                  Benchmark Kompetitif Riil
                </span>
                <h3 className="text-xl font-bold text-ink">
                  Ketahui Posisi Anda di Antara Ribuan Pesaing
                </h3>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Lolos passing grade tidak menjamin kelulusan jika kuota formasi terbatas. Persentil nasional TestHub langsung memperlihatkan posisi ranking Anda secara transparan dibanding seluruh peserta aktif bulan ini.
                </p>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start space-x-2 text-xs text-ink">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Distribusi kurva lonceng normal standar seleksi BKN & Kemendikbud</span>
                  </div>
                  <div className="flex items-start space-x-2 text-xs text-ink">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Prediksi kelulusan berdasar rasio peserta vs formasi kuota</span>
                  </div>
                </div>
              </div>

              {/* Visual Percentile Card */}
              <div className="lg:col-span-6 bg-surface border border-borderline rounded-lg p-6 text-center space-y-5 shadow-subtle">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold font-mono">
                  <span>🏆 TOP 8.4% NASIONAL</span>
                </div>

                <div className="space-y-1">
                  <div className="text-4xl sm:text-5xl font-extrabold text-ink font-mono tabular-nums tracking-tight">
                    428 <span className="text-base text-ink-muted font-normal font-sans">/ 550</span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    Lebih unggul dari <strong className="text-ink">13.570</strong> dari total 14.820 peserta simulasi aktif
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left pt-2 border-t border-borderline text-xs">
                  <div className="p-3 bg-canvas rounded-md border border-borderline">
                    <div className="text-ink-muted text-[11px]">Status Ambang Batas</div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">Memenuhi Passing Grade</div>
                  </div>
                  <div className="p-3 bg-canvas rounded-md border border-borderline">
                    <div className="text-ink-muted text-[11px]">Rekomendasi</div>
                    <div className="text-ink font-semibold mt-0.5">Siap SKB Lanjutan</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'certificate' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="text-[11px] font-mono text-warning uppercase font-bold tracking-wider">
                  Bukti Kompetensi Resmi
                </span>
                <h3 className="text-xl font-bold text-ink">
                  Sertifikat Nilai Digital Ber-UUID & Verifikasi QR-Code
                </h3>
                <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                  Setiap peserta yang lulus passing grade mendapatkan sertifikat digital resmi yang dapat diunduh (PDF) dan divalidasi keasliannya secara publik oleh institusi pemberi kerja melalui scan QR-Code instan.
                </p>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start space-x-2 text-xs text-ink">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Nomor seri unik berbasis UUID anti-duplikasi</span>
                  </div>
                  <div className="flex items-start space-x-2 text-xs text-ink">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>Laman verifikasi publik resmi di `/verify/certificate/:id`</span>
                  </div>
                </div>
              </div>

              {/* Visual Certificate Mockup */}
              <div className="lg:col-span-6 bg-surface border-2 border-dashed border-borderline rounded-lg p-6 space-y-4 shadow-subtle relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-borderline pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-accent" />
                    <span className="text-xs font-mono font-bold tracking-wider text-ink uppercase">TESTHUB OFFICIAL ACCREDITATION</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">VERIFIED</span>
                </div>

                <div className="space-y-2 text-left">
                  <div className="text-[11px] font-mono text-ink-muted">SERTIFIKAT KELULUSAN ASESMEN</div>
                  <div className="text-base font-bold text-ink">Simulasi Nasional CAT SKD CPNS 2026</div>
                  <div className="text-xs text-ink-muted">Diberikan atas capaian nilai di atas ambang batas resmi.</div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-borderline">
                  <div className="text-xs font-mono">
                    <div className="text-ink-muted text-[10px]">ID VERIFIKASI RESMI</div>
                    <div className="text-ink font-semibold">CERT-2026-CPNS-8849</div>
                  </div>

                  <div className="w-12 h-12 bg-canvas border border-borderline rounded flex items-center justify-center text-ink" title="QR Code Verifikasi Resmi">
                    <QrCode className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
