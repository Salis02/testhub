import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Question, TestCategory, DifficultyLevel } from '@/types'
import { api } from '@/services/api'
import {
  Sparkles,
  X,
  ShieldCheck,
  PlusCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Skeleton } from '@/components/common/Skeleton'
import { useToast } from '@/context/ToastContext'

interface AIAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  onAppendQuestions: (generatedQuestions: Question[]) => void
}

const PROGRESS_STAGES = [
  { min: 0, max: 20, text: 'Menginisialisasi Multi-Provider Engine (Gemini / Groq)...' },
  { min: 20, max: 45, text: 'Menganalisis domain kurikulum & standar asesmen...' },
  { min: 45, max: 70, text: 'Merumuskan butir pertanyaan & kunci distractor seimbang...' },
  { min: 70, max: 90, text: 'Menjalankan validasi kepatuhan format & rasionalisasi ilmiah...' },
  { min: 90, max: 99, text: 'Menyelesaikan verifikasi akhir butir asesmen...' },
]

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onAppendQuestions,
}) => {
  const [category, setCategory] = useState<TestCategory>('cpns')
  const [subject, setSubject] = useState('Tes Wawasan Kebangsaan - Integritas & Nilai Dasar ASN')
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium')
  const [count, setCount] = useState<number>(3)
  const toast = useToast()

  // Loading, progress & timer states
  const [loading, setLoading] = useState(false)
  const [progressPercent, setProgressPercent] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentStageText, setCurrentStageText] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [generatedList, setGeneratedList] = useState<Question[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0)

  const abortControllerRef = useRef<AbortController | null>(null)
  const progressTimerRef = useRef<number | null>(null)
  const elapsedTimerRef = useRef<number | null>(null)

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  // Cleanup on unmount or modal close
  useEffect(() => {
    return () => {
      clearTimers()
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [isOpen])

  const clearTimers = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current)
    progressTimerRef.current = null
    elapsedTimerRef.current = null
  }

  const handleGenerate = async () => {
    setErrorMsg(null)
    setGeneratedList([])
    setLoading(true)
    setProgressPercent(5)
    setElapsedSeconds(0)
    setCurrentStageText(PROGRESS_STAGES[0].text)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // 1. Elapsed timer
    const startTime = Date.now()
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    // 2. Realistic progressing curve
    progressTimerRef.current = window.setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 95) return 95
        const step = prev < 50 ? Math.floor(Math.random() * 8) + 4 : Math.floor(Math.random() * 4) + 1
        const next = Math.min(95, prev + step)

        // Update stage text dynamically
        const stage = PROGRESS_STAGES.find((s) => next >= s.min && next < s.max)
        if (stage) setCurrentStageText(stage.text)

        return next
      })
    }, 450)

    try {
      const list = await api.generateQuestionsAI(
        {
          category,
          subject: subject.trim(),
          difficulty,
          count: Math.min(10, Math.max(1, count)),
        },
        abortController.signal
      )

      clearTimers()
      setProgressPercent(100)
      setCurrentStageText('Selesai! Butir soal berhasil dibuat dan divalidasi.')

      setTimeout(() => {
        setGeneratedList(list)
        setLoading(false)
        setExpandedIndex(0)
        toast.success(
          'Generasi AI Berhasil',
          `${list.length} butir butir soal baru telah dibuat dan siap ditinjau.`
        )
      }, 400)
    } catch (err: unknown) {
      clearTimers()
      setLoading(false)
      const error = err as Error
      if (error.name === 'AbortError') {
        setErrorMsg('Generasi soal dibatalkan oleh pengguna.')
        toast.info('Dibatalkan', 'Proses generasi soal dibatalkan.')
      } else {
        setErrorMsg(error.message || 'Gagal menghubungi layanan AI.')
        toast.error('Gagal Generasi AI', error.message || 'Layanan AI mengalami kendala.')
      }
    }
  }

  const handleCancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    clearTimers()
    setLoading(false)
    setProgressPercent(0)
    setErrorMsg('Proses generasi dibatalkan.')
    toast.info('Dibatalkan', 'Proses generasi soal dibatalkan.')
  }

  const handleInsertAll = () => {
    if (generatedList.length === 0) return
    const totalAdded = generatedList.length
    onAppendQuestions(generatedList)
    setGeneratedList([])
    toast.success(
      'Soal Berhasil Disisipkan',
      `${totalAdded} butir soal telah ditambahkan ke lembar modul ujian.`
    )
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 dark:bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-ink">
                  AI Multi-Provider Question Generator
                </h3>
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Cpu className="w-3 h-3" />
                  <span>Gemini 2.5 / Groq Engine</span>
                </span>
              </div>
              <p className="text-xs text-ink-muted">
                Generator butir soal otomatis dengan auto-rotation multi-key dan validasi format terstruktur.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleCancelGeneration()
              onClose()
            }}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security & Validation Notice */}
        <div className="p-3.5 rounded-md bg-canvas border border-borderline text-xs space-y-1.5 font-mono">
          <div className="flex items-center space-x-2 text-ink font-semibold">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>Standar Validasi Kepatuhan (AI_AGENT_AND_SECURITY.md):</span>
          </div>
          <ul className="list-disc list-inside text-ink-muted space-y-0.5 text-[11px]">
            <li>Hanya membuat soal berbobot ilmiah dengan 1 opsi benar & 4 distractor rasional.</li>
            <li>Panjang karakter seluruh opsi jawaban diseimbangkan secara proporsional.</li>
            <li>Didukung auto-failover provider: Google Gemini &rarr; Groq LLaMA &rarr; Local Engine.</li>
          </ul>
        </div>

        {/* Configuration Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
              Kategori Asesmen
            </label>
            <select
              disabled={loading}
              value={category}
              onChange={(e) => setCategory(e.target.value as TestCategory)}
              className="w-full p-2.5 rounded-md border border-borderline bg-canvas text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="cpns">CPNS / Sekolah Kedinasan (TWK/TIU)</option>
              <option value="sbmptn">UTBK-SNBT (Skolastik & Matematika)</option>
              <option value="iq">Raven Matrix & Logika Deduktif</option>
              <option value="custom">BUMN AKHLAK & Leadership</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
              Tingkat Kesulitan (Difficulty)
            </label>
            <select
              disabled={loading}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              className="w-full p-2.5 rounded-md border border-borderline bg-canvas text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="easy">Mudah (Dasar / Pemahaman Teori)</option>
              <option value="medium">Sedang (Standar Ujian Nasional)</option>
              <option value="hard">Tinggi / HOTS (Analisis & Evaluasi)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
              Topik Spesifik / Mata Uji (Subject) *
            </label>
            <input
              type="text"
              disabled={loading}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Contoh: Silogisme Logika Kompleks, Deret Geometri, Pancasila"
              className="w-full p-2.5 rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
              Jumlah Butir Soal (1 - 10 Soal)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              disabled={loading}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full p-2.5 rounded-md border border-borderline bg-canvas text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-end">
            {loading ? (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="w-full py-2.5 px-4 rounded-md border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold hover:bg-red-500/20 transition-colors flex items-center justify-center space-x-2 text-xs"
              >
                <X className="w-4 h-4" />
                <span>Batalkan Proses</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!subject.trim()}
                className="w-full py-2.5 px-4 rounded-md bg-accent text-white font-semibold hover:opacity-95 shadow-xs transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50 text-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Mulai Buat Soal AI</span>
              </button>
            )}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center space-x-1 underline hover:opacity-80"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* LOADING & PROGRESSING STATE (Production-Ready) */}
        {loading && (
          <div className="p-5 rounded-lg border border-accent/30 bg-accent/5 space-y-4 animate-in fade-in duration-300">
            {/* Top progress metadata */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3.5 h-3.5 rounded-full bg-accent animate-ping"></div>
                <span className="font-semibold text-accent font-mono">
                  {currentStageText}
                </span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-ink-muted">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{elapsedSeconds}s</span>
                </span>
                <span className="font-bold text-accent tabular-nums">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Progress Bar with smooth transition */}
            <div className="w-full bg-borderline/40 h-2 rounded-full overflow-hidden">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* SKELETON PREVIEW CARDS (Shows structure of incoming questions) */}
            <div className="space-y-3 pt-2">
              <p className="text-[11px] font-mono text-ink-muted uppercase tracking-wider">
                Menyusun {count} butir soal pilihan ganda...
              </p>
              {Array.from({ length: Math.min(3, count) }).map((_, i) => (
                <div
                  key={i}
                  className="p-4 rounded-md bg-surface border border-borderline space-y-3 animate-pulse"
                >
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map((opt) => (
                      <div key={opt} className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-6 rounded flex-shrink-0" />
                        <Skeleton className="h-3.5 w-4/5 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GENERATED RESULTS PREVIEW */}
        {!loading && generatedList.length > 0 && (
          <div className="space-y-4 pt-3 border-t border-borderline animate-in fade-in duration-300">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-ink">
                  {generatedList.length} Butir Soal Terverifikasi & Siap Digunakan
                </span>
              </div>
              <button
                type="button"
                onClick={handleInsertAll}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Sisipkan Semua ke Bank Ujian</span>
              </button>
            </div>

            {/* Accordion / Card List of Generated Questions */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {generatedList.map((q, idx) => {
                const isExpanded = expandedIndex === idx

                return (
                  <div
                    key={q.id || idx}
                    className="rounded-lg bg-canvas border border-borderline overflow-hidden transition-all text-xs"
                  >
                    {/* Collapsible Card Header */}
                    <div
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-surface-hover/70 transition-colors select-none"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="font-mono text-xs font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                          #{idx + 1}
                        </span>
                        <p className="font-medium text-ink truncate max-w-md sm:max-w-xl">
                          {q.question_text}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 text-ink-muted">
                        <span className="font-mono text-[11px] uppercase hidden sm:inline">
                          {q.difficulty_level}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>

                    {/* Card Content */}
                    {isExpanded && (
                      <div className="p-4 pt-2 border-t border-borderline/60 space-y-3 bg-surface">
                        <p className="text-ink leading-relaxed font-normal">
                          {q.question_text}
                        </p>

                        {/* Options */}
                        <div className="space-y-1.5 pt-1">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id || opt.option_letter}
                              className={`flex items-start p-2 rounded border text-xs ${
                                opt.is_correct
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-ink font-medium'
                                  : 'border-borderline bg-canvas text-ink-muted'
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded font-mono text-[11px] font-bold flex items-center justify-center mr-2.5 flex-shrink-0 ${
                                  opt.is_correct
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-surface border border-borderline text-ink-muted'
                                }`}
                              >
                                {opt.option_letter}
                              </span>
                              <div className="flex-1">
                                <span>{opt.option_text}</span>
                                {opt.is_correct && (
                                  <span className="ml-2 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                    ✓ Kunci Jawaban
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="p-3 rounded-md bg-accent/5 border-l-2 border-accent border-borderline/40 text-[11px] text-ink/90">
                            <span className="font-semibold text-accent block mb-0.5">
                              Rasionalisasi Ilmiah:
                            </span>
                            <p className="leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
