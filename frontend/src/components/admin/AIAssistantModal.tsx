import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Question, TestCategory, DifficultyLevel } from '@/types'
import { api } from '@/services/api'
import {
  Sparkles,
  X,
  PlusCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Cpu,
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
  const [customPrompt, setCustomPrompt] = useState('')
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
    setProgressPercent(2)
    setElapsedSeconds(0)
    setCurrentStageText('Menginisialisasi Multi-Provider SSE Stream (Gemini & Groq)...')

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const startTime = Date.now()
    elapsedTimerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    try {
      const targetCount = Math.min(50, Math.max(1, count))
      let liveQuestions: Question[] = []

      await api.streamGenerateQuestionsAI(
        {
          category,
          subject: subject.trim(),
          difficulty,
          count: targetCount,
          custom_prompt: customPrompt.trim() || undefined,
        },
        (chunk) => {
          liveQuestions = [...liveQuestions, ...chunk.questions]
          setGeneratedList([...liveQuestions])

          const percent = Math.min(100, Math.round((chunk.completed_count / chunk.total_count) * 100))
          setProgressPercent(percent)
          setCurrentStageText(
            `Batch ${chunk.batch_index}/${chunk.total_batches} selesai via ${chunk.provider} (${chunk.completed_count}/${chunk.total_count} soal)`
          )
        },
        abortController.signal
      )

      clearTimers()
      setProgressPercent(100)
      setCurrentStageText(`Selesai! ${liveQuestions.length} butir soal berhasil dibuat dan divalidasi.`)
      setLoading(false)
      setExpandedIndex(0)
      toast.success(
        'Generasi AI Berhasil',
        `${liveQuestions.length} butir soal telah berhasil dibuat dan siap disisipkan.`
      )
    } catch (err: unknown) {
      clearTimers()
      setLoading(false)
      const error = err as Error
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        // Discontinued by user
      } else {
        setErrorMsg(error.message || 'Gagal menghubungi layanan AI streaming.')
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
    if (generatedList.length > 0) {
      toast.info(
        'Generasi Dihentikan',
        `${generatedList.length} butir soal yang sudah selesai tetap tersimpan dan siap disisipkan ke draf.`
      )
    } else {
      setErrorMsg('Proses generasi dibatalkan.')
      toast.info('Dibatalkan', 'Proses generasi soal dibatalkan.')
    }
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
      <div className="bg-surface border border-borderline rounded-lg max-w-4xl xl:max-w-5xl w-full p-6 sm:p-7 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
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

          {/* Custom Prompt / Specific Guidelines */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-ink uppercase tracking-wider">
                Instruksi Spesifik / Konteks Tambahan (Opsional)
              </label>
              <span className={`text-[11px] font-mono ${customPrompt.length > 270 ? 'text-amber-500 font-bold' : 'text-ink-muted'}`}>
                {customPrompt.length} / 300
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={300}
              disabled={loading}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Contoh: Fokus pada studi kasus dilema etika ASN dengan konflik kepentingan, gunakan skenario kantor dinas..."
              className="w-full p-2.5 rounded-md border border-borderline bg-canvas text-ink text-xs focus:outline-none focus:ring-2 focus:ring-accent leading-relaxed"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] text-ink-muted font-medium mr-1">Preset Cepat:</span>
              {[
                'Studi kasus dilema etika',
                'Silogisme 3 premis logis',
                'Soal cerita numerik komparatif',
                'Analisis tabel / data',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={loading}
                  onClick={() => setCustomPrompt((prev) => (prev ? `${prev}, ${preset.toLowerCase()}` : preset).slice(0, 300))}
                  className="text-[10px] px-2 py-0.5 rounded border border-borderline bg-surface hover:bg-surface-hover text-ink-muted hover:text-ink transition-colors"
                >
                  + {preset}
                </button>
              ))}
              {customPrompt && (
                <button
                  type="button"
                  onClick={() => setCustomPrompt('')}
                  className="text-[10px] text-red-500 hover:underline ml-1"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-ink uppercase tracking-wider">
                Target Jumlah Soal (1 - 50 Soal)
              </label>
              <span className="text-[10px] text-ink-muted font-mono font-bold text-accent">
                {count} Butir Soal
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min={1}
                max={50}
                disabled={loading}
                value={count}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (isNaN(val)) setCount(1)
                  else setCount(Math.min(50, Math.max(1, val)))
                }}
                className="w-20 p-2.5 rounded-md border border-borderline bg-canvas text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex items-center space-x-1.5 flex-1 flex-wrap gap-y-1">
                {[5, 10, 15, 20, 30, 40].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={loading}
                    onClick={() => setCount(preset)}
                    className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-md border transition-colors cursor-pointer ${
                      count === preset
                        ? 'bg-accent text-white border-accent font-semibold shadow-xs'
                        : 'border-borderline bg-surface text-ink-muted hover:text-ink hover:bg-surface-hover'
                    }`}
                  >
                    {preset} Soal
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-ink-muted mt-1.5">
              ⚡ <strong>SSE Multi-Key Chunking:</strong> Soal otomatis dipecah per batch 5 butir dan dialirkan live bergantian via 4 API Key (Gemini & Groq). Bebas batas token & timeout!
            </p>
          </div>

          <div className="flex items-end">
            {loading ? (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="w-full py-2.5 px-4 rounded-md border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 font-semibold hover:bg-red-500/20 transition-colors flex items-center justify-center space-x-2 text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Batalkan Proses</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!subject.trim()}
                className="w-full py-2.5 px-4 rounded-md bg-accent text-white font-semibold hover:opacity-95 shadow-xs transition-opacity flex items-center justify-center space-x-2 disabled:opacity-50 text-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Mulai Stream Soal AI</span>
              </button>
            )}
          </div>

          {/* Multi-Key SSE Architecture Banner */}
          <div className="sm:col-span-2 flex items-center justify-between p-2.5 rounded border border-accent/20 bg-accent/5 text-[11px] text-ink-muted">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                <strong>Multi-Provider Load Balancer:</strong> Permintaan <strong>{count} soal</strong> dibagi menjadi <strong>{Math.ceil(count / 5)} batch</strong> (@ 5 butir) berotasi otomatis ke Gemini 1 & 2 dan Groq 1 & 2.
              </span>
            </div>
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

            {/* SKELETON PREVIEW CARDS (only shown when waiting for first batch) */}
            {generatedList.length === 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-mono text-ink-muted uppercase tracking-wider">
                  Menyiapkan batch pertama ({Math.min(5, count)} butir soal) via multi-key provider...
                </p>
                {Array.from({ length: Math.min(2, count) }).map((_, i) => (
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GENERATED RESULTS PREVIEW (Live Stream or Done) */}
        {generatedList.length > 0 && (
          <div className="space-y-4 pt-3 border-t border-borderline animate-in fade-in duration-300">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <span className="text-xs font-semibold text-ink">
                  {generatedList.length} Butir Soal {loading ? 'Telah Masuk (Mengalir Live...)' : 'Terverifikasi & Siap Digunakan'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleInsertAll}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Sisipkan Semua ({generatedList.length} Soal) ke Bank Ujian</span>
              </button>
            </div>

            {/* Accordion / Card List of Generated Questions */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
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

              {/* Streaming next batch placeholder */}
              {loading && (
                <div className="p-3.5 rounded-lg border border-dashed border-accent/40 bg-accent/5 flex items-center justify-center space-x-2 text-xs font-mono text-accent animate-pulse">
                  <Cpu className="w-4 h-4 animate-spin shrink-0" />
                  <span>Sedang merotasi API key & mengalirkan batch butir berikutnya... ({generatedList.length}/{count} butir)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
