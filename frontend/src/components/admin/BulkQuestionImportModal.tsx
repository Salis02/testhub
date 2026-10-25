import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Question } from '@/types'
import {
  parseSpreadsheetToQuestions,
  downloadQuestionCsvTemplate,
  ParseRowError,
} from '@/utils/spreadsheetParser'
import {
  FileSpreadsheet,
  Download,
  Upload,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  FileText,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'

interface BulkQuestionImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportQuestions: (questions: Question[]) => void
  existingQuestionsCount?: number
}

type InputMode = 'file' | 'paste'

export const BulkQuestionImportModal: React.FC<BulkQuestionImportModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
  existingQuestionsCount = 0,
}) => {
  const toast = useToast()
  const [inputMode, setInputMode] = useState<InputMode>('file')
  const [pastedText, setPastedText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [rawText, setRawText] = useState<string>('')

  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([])
  const [parseErrors, setParseErrors] = useState<ParseRowError[]>([])
  const [hasParsed, setHasParsed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputMode('file')
      setPastedText('')
      setFileName(null)
      setRawText('')
      setParsedQuestions([])
      setParseErrors([])
      setHasParsed(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setRawText(content || '')
      triggerParse(content || '')
    }
    reader.readAsText(file)
  }

  const triggerParse = (textToParse: string) => {
    if (!textToParse.trim()) {
      setParsedQuestions([])
      setParseErrors([])
      setHasParsed(false)
      return
    }

    const { questions, errors } = parseSpreadsheetToQuestions(
      textToParse,
      existingQuestionsCount + 1
    )
    setParsedQuestions(questions)
    setParseErrors(errors)
    setHasParsed(true)

    if (questions.length > 0) {
      toast.info(
        'Parsing Berhasil',
        `${questions.length} butir soal teridentifikasi valid.`
      )
    }
  }

  const handlePasteChange = (val: string) => {
    setPastedText(val)
    setRawText(val)
    triggerParse(val)
  }

  const handleConfirmImport = () => {
    if (parsedQuestions.length === 0) return
    onImportQuestions(parsedQuestions)
    toast.success(
      'Impor Soal Berhasil',
      `${parsedQuestions.length} butir soal disisipkan ke formulir ujian.`
    )
    onClose()
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ink/60 dark:bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-surface border border-borderline rounded-xl max-w-4xl w-full p-6 sm:p-7 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderline pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-ink">
                Impor Soal Massal (Excel / CSV)
              </h3>
              <p className="text-xs text-ink-muted">
                Unggah berkas spreadsheet atau salin langsung dari Microsoft Excel & Google Sheets.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={downloadQuestionCsvTemplate}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-borderline bg-canvas text-xs font-semibold text-ink hover:bg-surface-hover btn-press focus-ring transition-colors cursor-pointer"
              title="Unduh berkas template spreadsheet dengan format kolom standar"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Unduh Template Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Input Mode Selector */}
        <div className="flex items-center space-x-2 p-1 bg-canvas border border-borderline rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setInputMode('file')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              inputMode === 'file'
                ? 'bg-surface text-ink shadow-xs border border-borderline'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Berkas (.csv / .tsv)</span>
          </button>
          <button
            type="button"
            onClick={() => setInputMode('paste')}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              inputMode === 'paste'
                ? 'bg-surface text-ink shadow-xs border border-borderline'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>Salin-Tempel Spreadsheet</span>
          </button>
        </div>

        {/* Upload Zone or Paste Area */}
        {inputMode === 'file' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-borderline hover:border-accent/50 rounded-xl p-8 text-center cursor-pointer bg-canvas/40 hover:bg-canvas transition-colors space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-accent/10 text-accent mx-auto flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {fileName ? fileName : 'Pilih atau Tarik Berkas Spreadsheet ke Sini'}
              </p>
              <p className="text-xs text-ink-muted mt-0.5">
                Mendukung berkas CSV standar Excel (.csv) dan teks tabulasi (.tsv).
              </p>
            </div>
            {fileName && (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-surface border border-borderline text-[11px] font-mono text-ink">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>{fileName}</span>
              </span>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-ink">
              Salin Baris dari Excel / Google Sheets lalu Tempel (Ctrl+V) di Sini:
            </label>
            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="Contoh salinan tabel Excel:&#10;1	Ibu kota baru RI	Bandung	Nusantara	Surabaya	Medan	Makassar	B	IKN Kaltim	5	easy"
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent resize-y"
            />
          </div>
        )}

        {/* Validation & Preview Summary */}
        {hasParsed && (
          <div className="space-y-4">
            {/* Metric pill bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-lg border border-borderline bg-canvas">
              <div className="flex items-center space-x-3">
                <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{parsedQuestions.length} Soal Valid</span>
                </div>
                {parseErrors.length > 0 && (
                  <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-warning">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{parseErrors.length} Baris Bermasalah</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono text-ink-muted">
                Nomor awal: #{existingQuestionsCount + 1} s/d #{existingQuestionsCount + parsedQuestions.length}
              </span>
            </div>

            {/* Error alerts if any */}
            {parseErrors.length > 0 && (
              <div className="p-3.5 rounded-lg border border-warning-border bg-warning-subtle text-xs space-y-1.5">
                <p className="font-semibold text-warning flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Beberapa baris spreadsheet dilewati karena tidak memenuhi kriteria validasi:</span>
                </p>
                <ul className="list-disc list-inside text-ink space-y-1 font-mono text-[11px]">
                  {parseErrors.slice(0, 5).map((err, idx) => (
                    <li key={idx}>
                      Baris {err.row}: {err.message}
                    </li>
                  ))}
                  {parseErrors.length > 5 && (
                    <li className="italic text-ink-muted">
                      ...dan {parseErrors.length - 5} baris bermasalah lainnya.
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Questions Table Preview */}
            {parsedQuestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Pratinjau Butir Soal Terbaca ({parsedQuestions.length} Soal)
                </h4>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-borderline bg-surface divide-y divide-borderline">
                  {parsedQuestions.map((q, idx) => {
                    const correctOpt = q.options.find((o) => o.is_correct)
                    return (
                      <div
                        key={q.id}
                        className="p-3 hover:bg-surface-hover/70 transition-colors text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-canvas border border-borderline text-ink">
                              #{q.question_number}
                            </span>
                            <span className="font-medium text-ink line-clamp-1">
                              {q.question_text}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent-tint text-accent border border-accent/20">
                              Kunci: {correctOpt?.option_letter || '-'}
                            </span>
                            <span className="text-[10px] font-mono text-ink-muted">
                              {q.points} Poin
                            </span>
                          </div>
                        </div>

                        {/* Options preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-6 text-[11px] text-ink-muted">
                          {q.options.map((opt) => (
                            <div
                              key={opt.id}
                              className={`flex items-center space-x-1.5 ${
                                opt.is_correct
                                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                  : ''
                              }`}
                            >
                              <span className="font-mono">{opt.option_letter}.</span>
                              <span className="truncate">{opt.option_text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-borderline">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-borderline bg-surface text-ink hover:bg-surface-hover btn-press focus-ring transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={parsedQuestions.length === 0}
            onClick={handleConfirmImport}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-accent text-white hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed btn-press focus-ring shadow-subtle transition-all cursor-pointer"
          >
            <span>Sisipkan {parsedQuestions.length} Soal ke Modul</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
