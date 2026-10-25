import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useForm, FormProvider, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Question } from '@/types'
import { TestFormSchema, TestFormValues } from '@/schemas/test.schema'
import { QuestionFormField } from '@/components/admin/QuestionFormField'
import { BulkQuestionImportModal } from '@/components/admin/BulkQuestionImportModal'
import { AdminModalSize, ADMIN_MODAL_WIDTH_CLASSES } from '@/components/admin/TestCreatorModal'
import { exportQuestionsToCsv } from '@/utils/spreadsheetParser'
import { api } from '@/services/api'
import { Skeleton } from '@/components/common/Skeleton'
import {
  X,
  Plus,
  Sparkles,
  Loader2,
  Shuffle,
  Tag,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileSpreadsheet,
  Download,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from '@/context/ToastContext'

interface TestEditorModalProps {
  isOpen: boolean
  testId: string | null
  onClose: () => void
  onUpdated: () => void
  onOpenAIAssistant: () => void
  pendingAIQuestions?: Question[]
  onClearPendingAIQuestions?: () => void
}

const DEFAULT_FORM_VALUES: TestFormValues = {
  title: '',
  description: '',
  category: 'cpns',
  duration_minutes: 25,
  passing_score_percentage: 65,
  price_idr: 0,
  shuffle_questions: false,
  shuffle_answers: false,
  published: true,
  require_fullscreen: false,
  detect_tab_switch: false,
  block_copy_paste: false,
  max_violations: 3,
  questions: [],
}

export const TestEditorModal: React.FC<TestEditorModalProps> = ({
  isOpen,
  testId,
  onClose,
  onUpdated,
  onOpenAIAssistant,
  pendingAIQuestions = [],
  onClearPendingAIQuestions,
}) => {
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(5)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [modalSize, setModalSize] = useState<AdminModalSize>('wide')
  const toast = useToast()

  const methods = useForm<TestFormValues>({
    resolver: zodResolver(TestFormSchema) as any,
    defaultValues: DEFAULT_FORM_VALUES,
    mode: 'onTouched',
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = methods

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  })

  const watchedPrice = watch('price_idr') || 0
  const watchedQuestions = watch('questions') || []

  // Load test data on open
  useEffect(() => {
    if (isOpen && testId) {
      setCurrentPage(1)
      loadTestDetails(testId)
    }
  }, [isOpen, testId])

  // Append pending AI questions if available
  useEffect(() => {
    if (isOpen && pendingAIQuestions && pendingAIQuestions.length > 0) {
      pendingAIQuestions.forEach((q, idx) => {
        append({
          id: `q-append-${Date.now()}-${idx}`,
          test_id: testId || '',
          question_number: fields.length + idx + 1,
          question_text: q.question_text,
          question_type: q.question_type || 'multiple_choice',
          difficulty_level: q.difficulty_level || 'medium',
          points: q.points || 5,
          explanation: q.explanation || '',
          media_url: q.media_url || null,
          options: (q.options || []).map((opt) => ({
            id: opt.id || `opt-${Date.now()}-${opt.option_letter}`,
            option_letter: opt.option_letter,
            option_text: opt.option_text,
            is_correct: Boolean(opt.is_correct),
          })),
        })
      })

      if (onClearPendingAIQuestions) {
        onClearPendingAIQuestions()
      }
      toast.success(
        'Soal AI Ditambahkan',
        `${pendingAIQuestions.length} butir soal hasil generasi AI disematkan ke editor.`
      )
    }
  }, [isOpen, pendingAIQuestions])

  const loadTestDetails = async (id: string) => {
    try {
      setLoading(true)
      const data = await api.getAdminTest(id)
      reset({
        title: data.test.title,
        description: data.test.description || '',
        category: data.test.category,
        duration_minutes: data.test.duration_minutes,
        passing_score_percentage: data.test.passing_score_percentage,
        price_idr: data.test.price_idr ?? 0,
        shuffle_questions: Boolean(data.test.shuffle_questions),
        shuffle_answers: Boolean(data.test.shuffle_answers),
        published: Boolean(data.test.published),
        require_fullscreen: Boolean(data.test.require_fullscreen),
        detect_tab_switch: Boolean(data.test.detect_tab_switch),
        block_copy_paste: Boolean(data.test.block_copy_paste),
        max_violations: data.test.max_violations || 3,
        questions: (data.questions || []).map((q, idx) => ({
          id: q.id,
          test_id: q.test_id || id,
          question_number: idx + 1,
          question_text: q.question_text,
          question_type: q.question_type || 'multiple_choice',
          difficulty_level: q.difficulty_level || 'medium',
          points: q.points || 5,
          explanation: q.explanation || '',
          media_url: q.media_url || null,
          options: (q.options || []).map((o) => ({
            id: o.id,
            option_letter: o.option_letter,
            option_text: o.option_text,
            is_correct: Boolean(o.is_correct),
          })),
        })),
      })
    } catch (err) {
      toast.error('Gagal Memuat Data Ujian', (err as Error).message)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleImportQuestions = (imported: Question[]) => {
    imported.forEach((q, idx) => {
      append({
        id: `q-import-${Date.now()}-${idx}`,
        test_id: testId || '',
        question_number: fields.length + idx + 1,
        question_text: q.question_text,
        question_type: q.question_type || 'multiple_choice',
        difficulty_level: q.difficulty_level || 'medium',
        points: q.points || 5,
        explanation: q.explanation || '',
        media_url: q.media_url || null,
        options: (q.options || []).map((opt) => ({
          id: opt.id || `opt-${Date.now()}-${idx}-${opt.option_letter}`,
          option_letter: (opt.option_letter || 'A').toUpperCase() as any,
          option_text: opt.option_text,
          is_correct: Boolean(opt.is_correct),
        })),
      })
    })

    toast.success(
      'Soal Berhasil Diimpor',
      `${imported.length} butir soal hasil impor spreadsheet telah ditambahkan.`
    )
  }

  const handleAddQuestion = () => {
    append({
      id: `q-new-${Date.now()}`,
      test_id: testId || '',
      question_number: fields.length + 1,
      question_text: '',
      question_type: 'multiple_choice',
      difficulty_level: 'medium',
      points: 5,
      explanation: '',
      media_url: null,
      options: [
        { option_letter: 'A', option_text: '', is_correct: true },
        { option_letter: 'B', option_text: '', is_correct: false },
        { option_letter: 'C', option_text: '', is_correct: false },
        { option_letter: 'D', option_text: '', is_correct: false },
      ],
    })

    // Automatically navigate to the newly added question's page
    if (pageSize > 0) {
      const newTotal = fields.length + 1
      setCurrentPage(Math.ceil(newTotal / pageSize))
    }
  }

  const handleFormSubmit = async (values: TestFormValues) => {
    if (!testId) return

    try {
      const formattedQuestions: Question[] = values.questions.map((q, idx) => ({
        id: q.id || `q-update-${idx + 1}-${Date.now()}`,
        test_id: testId,
        question_number: idx + 1,
        question_text: q.question_text,
        question_type: q.question_type,
        difficulty_level: q.difficulty_level,
        points: q.points,
        explanation: q.explanation || '',
        media_url: q.media_url || null,
        options: (q.options || []).map((o, optIdx) => ({
          id: o.id || `opt-${idx + 1}-${optIdx + 1}-${Date.now()}`,
          option_letter: o.option_letter,
          option_text: o.option_text,
          is_correct: o.is_correct,
        })),
      }))

      await api.updateAdminTest(
        testId,
        {
          title: values.title.trim(),
          description: values.description?.trim() || '',
          category: values.category,
          duration_minutes: values.duration_minutes,
          passing_score_percentage: values.passing_score_percentage,
          price_idr: values.price_idr ?? 0,
          shuffle_questions: values.shuffle_questions,
          shuffle_answers: values.shuffle_answers,
          published: values.published,
          require_fullscreen: values.require_fullscreen,
          detect_tab_switch: values.detect_tab_switch,
          block_copy_paste: values.block_copy_paste,
          max_violations: values.max_violations,
        },
        formattedQuestions
      )

      toast.success(
        'Modul & Soal Berhasil Diperbarui',
        `Perubahan pada "${values.title.trim()}" telah disimpan ke server.`
      )
      onUpdated()
      onClose()
    } catch (err) {
      toast.error('Gagal Memperbarui Modul', (err as Error).message)
    }
  }

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  if (!isOpen) return null

  // Pagination calculation
  const totalQuestions = fields.length
  const effectivePageSize = pageSize > 0 ? pageSize : totalQuestions || 1
  const totalPages = Math.ceil(totalQuestions / effectivePageSize) || 1
  const safePage = Math.min(Math.max(1, currentPage), totalPages)
  const startIndex = (safePage - 1) * effectivePageSize
  const endIndex = Math.min(startIndex + effectivePageSize, totalQuestions)
  const visibleFields = fields.slice(startIndex, endIndex)

  const handleJumpToQuestion = (qIndex: number) => {
    if (pageSize > 0) {
      const targetPage = Math.floor(qIndex / pageSize) + 1
      setCurrentPage(targetPage)
    }
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 dark:bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-surface border border-borderline rounded-lg ${ADMIN_MODAL_WIDTH_CLASSES[modalSize]} w-full p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto transition-all duration-200`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-borderline pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-ink">
                Edit Modul Ujian & Bank Soal
              </h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                {testId}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Sesuaikan seluruh parameter ujian, biaya paywall, acak soal, serta butir pertanyaan.
            </p>
          </div>
          <div className="flex items-center space-x-2.5 self-end sm:self-auto">
            {/* Modal Width Size Variants */}
            <div
              className="inline-flex items-center p-0.5 rounded-lg border border-borderline bg-canvas text-xs font-mono"
              title="Pilih varian lebar modal"
            >
              {(
                [
                  { key: 'normal', label: 'Normal' },
                  { key: 'wide', label: 'Lebar' },
                  { key: 'extra', label: 'Ekstra' },
                  { key: 'full', label: 'Penuh' },
                ] as const
              ).map((variant) => (
                <button
                  key={variant.key}
                  type="button"
                  onClick={() => setModalSize(variant.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    modalSize === variant.key
                      ? 'bg-accent text-white shadow-xs font-semibold'
                      : 'text-ink-muted hover:text-ink hover:bg-surface-hover'
                  }`}
                  title={`Ganti lebar modal: ${variant.label}`}
                >
                  {variant.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center space-x-2 text-ink-muted text-sm font-mono">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span>Memuat butir soal dan parameter modul dari server...</span>
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-20 w-full rounded" />
              <Skeleton className="h-40 w-full rounded" />
            </div>
          </div>
        ) : (
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
              {/* Metadata Fields Section */}
              <div className="space-y-4 bg-canvas/60 p-4 rounded-lg border border-borderline">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center space-x-2">
                  <span>Parameter Modul Ujian</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Title */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                      Judul Ujian / Modul *
                    </label>
                    <input
                      type="text"
                      {...register('title')}
                      placeholder="Judul modul ujian..."
                      className={`w-full px-3 py-2 text-sm rounded-md border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent ${
                        errors.title ? 'border-red-500' : 'border-borderline'
                      }`}
                    />
                    {errors.title && (
                      <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                      Deskripsi & Petunjuk Pengerjaan
                    </label>
                    <textarea
                      rows={2}
                      {...register('description')}
                      placeholder="Deskripsi materi uji dan ketentuan peserta..."
                      className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                      Kategori Asesmen
                    </label>
                    <select
                      {...register('category')}
                      className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                    >
                      <option value="cpns">CPNS / Sekolah Kedinasan</option>
                      <option value="sbmptn">UTBK-SNBT Kemendikbud</option>
                      <option value="iq">IQ Matrix Assessment</option>
                      <option value="custom">BUMN AKHLAK / Custom</option>
                    </select>
                  </div>

                  {/* Price IDR (Paywall Integration) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                        Biaya Akses (IDR)
                      </label>
                      <span className="text-[11px] font-mono font-bold text-accent">
                        {watchedPrice > 0 ? formatRupiah(watchedPrice) : 'Akses Gratis'}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        {...register('price_idr', { valueAsNumber: true })}
                        placeholder="0 = Akses Gratis, >0 = Paywall"
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-borderline bg-surface text-ink font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                      <Tag className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[10px] text-ink-muted mt-1">
                      Isi 0 untuk modul gratis, atau nominal (cth: 15000) untuk mengunci ujian via Midtrans QRIS.
                    </p>
                  </div>

                  {/* Duration & Passing Score */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                        Durasi (Menit)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={300}
                        {...register('duration_minutes', { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                      />
                      {errors.duration_minutes && (
                        <p className="text-[11px] text-red-500 mt-0.5">{errors.duration_minutes.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                        Passing Grade (%)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        {...register('passing_score_percentage', { valueAsNumber: true })}
                        className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                      />
                      {errors.passing_score_percentage && (
                        <p className="text-[11px] text-red-500 mt-0.5">{errors.passing_score_percentage.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Toggles: Shuffle & Published */}
                  <div className="flex flex-col justify-center space-y-2.5 pt-2">
                    <label className="flex items-center space-x-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('shuffle_questions')}
                        className="rounded border-borderline text-accent focus:ring-accent w-4 h-4"
                      />
                      <span className="font-medium">Acak Urutan Soal (Shuffle Questions)</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('shuffle_answers')}
                        className="rounded border-borderline text-accent focus:ring-accent w-4 h-4"
                      />
                      <span className="font-medium">Acak Opsi Pilihan Ganda (Shuffle Answers)</span>
                    </label>

                    <label className="flex items-center space-x-2 text-xs text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('published')}
                        className="rounded border-borderline text-accent focus:ring-accent w-4 h-4"
                      />
                      <span className="font-medium text-emerald-600 dark:text-emerald-400 font-semibold">
                        Publikasikan Modul (Dapat diakses peserta)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Proctoring & Anti-Cheat Settings Section */}
              <div className="space-y-4 bg-canvas/60 p-4 rounded-lg border border-borderline">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                    Protokol Pengawasan Ujian (Web Proctoring & Anti-Cheat)
                  </h4>
                </div>
                <p className="text-[11px] text-ink-muted -mt-2">
                  Kontrol integritas ujian di level admin. Peserta akan melihat instruksi konfirmasi sebelum ujian dimulai sesuai pengaturan yang Anda aktifkan.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <label className="flex items-start space-x-2.5 p-2.5 rounded-md border border-borderline bg-surface hover:border-accent/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      {...register('require_fullscreen')}
                      className="rounded border-borderline text-accent focus:ring-accent w-4 h-4 mt-0.5 shrink-0"
                    />
                    <div>
                      <span className="block text-xs font-semibold text-ink">Wajib Layar Penuh (Fokus CAT)</span>
                      <span className="block text-[11px] text-ink-muted leading-tight">
                        Peserta diwajibkan masuk mode full screen (mensimulasikan CAT BKN/PTN resmi).
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 p-2.5 rounded-md border border-borderline bg-surface hover:border-accent/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      {...register('detect_tab_switch')}
                      className="rounded border-borderline text-accent focus:ring-accent w-4 h-4 mt-0.5 shrink-0"
                    />
                    <div>
                      <span className="block text-xs font-semibold text-ink">Deteksi Pindah Tab & Jendela</span>
                      <span className="block text-[11px] text-ink-muted leading-tight">
                        Catat peringatan jika peserta beralih tab peramban atau membuka jendela aplikasi lain.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 p-2.5 rounded-md border border-borderline bg-surface hover:border-accent/40 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      {...register('block_copy_paste')}
                      className="rounded border-borderline text-accent focus:ring-accent w-4 h-4 mt-0.5 shrink-0"
                    />
                    <div>
                      <span className="block text-xs font-semibold text-ink">Blokir Salin-Tempel (Anti-Copy)</span>
                      <span className="block text-[11px] text-ink-muted leading-tight">
                        Kunci teks soal dari aksi copy, cut, inspect, dan klik kanan.
                      </span>
                    </div>
                  </label>

                  <div className="p-2.5 rounded-md border border-borderline bg-surface flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-xs font-semibold text-ink">Batas Toleransi Pelanggaran</span>
                      <span className="block text-[11px] text-ink-muted">Maksimal peringatan sebelum evaluasi</span>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        {...register('max_violations', { valueAsNumber: true })}
                        className="w-14 px-2 py-1 text-xs rounded border border-borderline bg-canvas text-ink font-mono text-center focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                      <span className="text-xs text-ink-muted font-mono">kali</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Questions Section Header */}
              <div className="border-t border-borderline pt-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-ink flex items-center space-x-2">
                      <span>Daftar Butir Soal</span>
                      <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                        {totalQuestions} Butir Soal
                      </span>
                    </h4>
                    <p className="text-xs text-ink-muted">
                      Setiap butir soal memiliki bobot, tingkat kesulitan, lampiran media, dan opsi jawaban dinamis.
                    </p>
                    {errors.questions && typeof errors.questions.message === 'string' && (
                      <p className="text-xs text-red-500 mt-1">{errors.questions.message}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {fields.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          exportQuestionsToCsv(
                            watch('title') || 'ujian',
                            (watchedQuestions as Question[]) || []
                          )
                        }
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-borderline bg-canvas text-ink text-xs font-semibold hover:bg-surface-hover transition-colors shadow-xs"
                        title="Ekspor seluruh butir soal ke berkas spreadsheet CSV"
                      >
                        <Download className="w-3.5 h-3.5 text-accent" />
                        <span>Ekspor CSV</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors shadow-xs"
                      title="Impor butir soal dari spreadsheet Excel atau CSV"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Impor Excel/CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenAIAssistant}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-accent/40 bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-borderline bg-canvas text-ink text-xs font-semibold hover:bg-surface-hover transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Soal</span>
                    </button>
                  </div>
                </div>

                {/* Quick Question Number Grid Navigator */}
                {totalQuestions > 0 && (
                  <div className="p-3 rounded-lg border border-borderline bg-canvas/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span className="font-semibold uppercase tracking-wider text-ink">
                        Navigasi Cepat Soal:
                      </span>
                      <span>
                        Klik nomor untuk lompat langsung •{' '}
                        <strong className="text-accent">{safePage}</strong> dari {totalPages} hal
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {fields.map((field, qIdx) => {
                        const hasError = Boolean(errors.questions?.[qIdx])
                        const isCurrent = qIdx >= startIndex && qIdx < endIndex

                        return (
                          <button
                            key={field.id}
                            type="button"
                            onClick={() => handleJumpToQuestion(qIdx)}
                            className={`w-7 h-7 rounded text-xs font-mono transition-all flex items-center justify-center font-semibold ${
                              hasError
                                ? 'bg-red-500/15 border border-red-500 text-red-500 ring-1 ring-red-500/40'
                                : isCurrent
                                  ? 'bg-accent text-white shadow-xs ring-2 ring-accent/30 font-bold'
                                  : 'bg-surface border border-borderline text-ink hover:border-accent/40'
                            }`}
                            title={`Lompat ke Soal #${qIdx + 1}${hasError ? ' (Ada kesalahan validasi)' : ''}`}
                          >
                            {qIdx + 1}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Paginated Visible Question Cards */}
              <div className="space-y-6">
                {visibleFields.map((field, localIdx) => {
                  const actualIndex = startIndex + localIdx
                  return (
                    <QuestionFormField
                      key={field.id}
                      index={actualIndex}
                      onRemove={() => {
                        remove(actualIndex)
                        if (startIndex >= fields.length - 1 && safePage > 1) {
                          setCurrentPage(safePage - 1)
                        }
                      }}
                      canRemove={fields.length > 1}
                    />
                  )
                })}
              </div>

              {/* Pagination Controls Bar */}
              {totalQuestions > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-borderline bg-canvas">
                  <div className="flex items-center space-x-2 text-xs text-ink-muted">
                    <span>
                      Menampilkan soal <strong>{startIndex + 1}</strong> –{' '}
                      <strong>{endIndex}</strong> dari <strong>{totalQuestions}</strong> butir
                    </span>
                    <span>•</span>
                    <label className="flex items-center space-x-1.5">
                      <span>Per hal:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                        className="px-2 py-0.5 text-xs rounded border border-borderline bg-surface text-ink font-mono"
                      >
                        <option value={5}>5 soal</option>
                        <option value={10}>10 soal</option>
                        <option value={20}>20 soal</option>
                        <option value={0}>Tampilkan Semua</option>
                      </select>
                    </label>
                  </div>

                  {pageSize > 0 && totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage <= 1}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-borderline bg-surface text-xs font-medium text-ink hover:bg-surface-hover disabled:opacity-40 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Sebelumnya</span>
                      </button>

                      <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-surface border border-borderline">
                        {safePage} / {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage >= totalPages}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-borderline bg-surface text-xs font-medium text-ink hover:bg-surface-hover disabled:opacity-40 transition-colors"
                      >
                        <span>Berikutnya</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-borderline">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium rounded-md border border-borderline bg-canvas text-ink hover:bg-surface-hover transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-md bg-accent text-white hover:opacity-95 shadow-xs transition-opacity disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan Perubahan...</span>
                    </>
                  ) : (
                    <span>Simpan Pembaruan Ujian</span>
                  )}
                </button>
              </div>
            </form>
          </FormProvider>
        )}
      </div>

      {/* Bulk Excel/CSV Import Modal */}
      <BulkQuestionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportQuestions={handleImportQuestions}
        existingQuestionsCount={fields.length}
      />
    </div>,
    document.body
  )
}
