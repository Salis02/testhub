import React, { useState } from 'react'
import { Question, TestCategory, DifficultyLevel } from '@/types'
import { api } from '@/services/api'
import { Sparkles, X, ShieldCheck, PlusCircle } from 'lucide-react'

interface AIAssistantModalProps {
  isOpen: boolean
  onClose: () => void
  onAppendQuestions: (generatedQuestions: Question[]) => void
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onAppendQuestions,
}) => {
  const [category, setCategory] = useState<TestCategory>('cpns')
  const [subject, setSubject] = useState('Tes Intelegensia Umum - Penalaran Silogisme Tingkat Lanjut')
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium')
  const [count, setCount] = useState<number>(3)
  const [loading, setLoading] = useState(false)
  const [generatedList, setGeneratedList] = useState<Question[]>([])

  if (!isOpen) return null

  const handleGenerate = async () => {
    try {
      setLoading(true)
      const list = await api.generateQuestionsAI({
        category,
        subject,
        difficulty,
        count: Math.min(5, Math.max(1, count)), // constraint per AI_AGENT_AND_SECURITY.md (Max 5)
      })
      setGeneratedList(list)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleInsertAll = () => {
    onAppendQuestions(generatedList)
    setGeneratedList([])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 dark:bg-black/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">
                AI Question Generator (Prompt Specification v1.0)
              </h3>
              <p className="text-xs text-ink-muted">
                Berdasarkan pedoman keamanan dan batasan di <code className="font-mono text-accent">AI_AGENT_AND_SECURITY.md</code>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-ink-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security & Constraint Rules banner */}
        <div className="p-3.5 rounded-md bg-canvas border border-borderline text-xs space-y-1.5 font-mono">
          <div className="flex items-center space-x-2 text-ink font-semibold">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>Aturan & Batasan Agen AI:</span>
          </div>
          <ul className="list-disc list-inside text-ink-muted space-y-0.5 text-[11px]">
            <li>Hanya membuat soal terverifikasi faktual dengan 1 jawaban benar & 3-4 distractor.</li>
            <li>Opsi distractor memiliki panjang karakter berimbang (&Delta; &lt; 30 char).</li>
            <li>Batas maksimal 5 pertanyaan per permintaan (Rate Limit Proteksi).</li>
            <li>Wajib melalui tinjauan pengajar sebelum dipublikasikan ke peserta.</li>
          </ul>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
              Format / Kategori Ujian
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TestCategory)}
              className="w-full p-2 rounded-md border border-borderline bg-canvas text-ink font-mono"
            >
              <option value="cpns">CPNS (TWK / TIU / TKP)</option>
              <option value="sbmptn">UTBK-SNBT (Skolastik / Matematika)</option>
              <option value="iq">Raven Matrix & Logika Deduktif</option>
              <option value="custom">BUMN AKHLAK & Leadership</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
              Tingkat Kesulitan ({'{DIFFICULTY}'})
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
              className="w-full p-2 rounded-md border border-borderline bg-canvas text-ink font-mono"
            >
              <option value="easy">Mudah (Level 1-2)</option>
              <option value="medium">Sedang (Level 3)</option>
              <option value="hard">Tinggi / HOTS (Level 4-5)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
              Topik Spesifik / Subject Area ({'{SUBJECT}'})
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Contoh: Logika Silogisme, Pancasila & Bela Negara, Kalkulus"
              className="w-full p-2 rounded-md border border-borderline bg-canvas text-ink"
            />
          </div>

          <div>
            <label className="block font-semibold text-ink uppercase tracking-wider mb-1">
              Jumlah Soal (Maksimal 5)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full p-2 rounded-md border border-borderline bg-canvas text-ink font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-2 px-4 rounded-md bg-accent text-white font-semibold hover:opacity-95 shadow-xs transition-opacity flex items-center justify-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Menghasilkan Soal...' : 'Generate Soal AI'}</span>
            </button>
          </div>
        </div>

        {/* Generated Preview Results */}
        {generatedList.length > 0 && (
          <div className="space-y-4 pt-3 border-t border-borderline">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">
                Hasil Verifikasi AI ({generatedList.length} butir soal tervalidasi)
              </span>
              <button
                type="button"
                onClick={handleInsertAll}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tambahkan ke Bank Ujian</span>
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {generatedList.map((item, idx) => (
                <div key={idx} className="p-4 rounded-md bg-canvas border border-borderline text-xs space-y-2">
                  <p className="font-medium text-ink">{item.question_text}</p>
                  <div className="space-y-1 pl-2 font-mono text-[11px]">
                    {item.options.map((opt) => (
                      <div key={opt.id} className={opt.is_correct ? 'text-accent font-semibold' : 'text-ink-muted'}>
                        {opt.option_letter}. {opt.option_text} {opt.is_correct && '✓ (Kunci)'}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-ink-muted italic border-t border-borderline pt-1">
                    {item.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
