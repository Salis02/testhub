import React, { useState, useEffect } from 'react'
import { useForm, FormProvider, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Question } from '@/types'
import { TestFormSchema, TestFormValues } from '@/schemas/test.schema'
import { QuestionFormField } from '@/components/admin/QuestionFormField'
import { api } from '@/services/api'
import { Skeleton } from '@/components/common/Skeleton'
import { X, Plus, Sparkles, Loader2 } from 'lucide-react'
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
  published: true,
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
    formState: { errors, isSubmitting },
  } = methods

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  })

  // Load test data on open
  useEffect(() => {
    if (isOpen && testId) {
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
        published: data.test.published,
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
          published: values.published,
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 dark:bg-black/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderline pb-4">
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
              Perbarui parameter ujian, lampirkan media gambar pada soal, serta sesuaikan opsi jawaban.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-md text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center space-x-2 text-ink-muted text-sm font-mono">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
              <span>Memuat butir soal dan lampiran dari server...</span>
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
              {/* Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                    Judul Ujian / Modul *
                  </label>
                  <input
                    type="text"
                    {...register('title')}
                    placeholder="Judul modul ujian..."
                    className={`w-full px-3 py-2 text-sm rounded-md border bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent ${
                      errors.title ? 'border-red-500' : 'border-borderline'
                    }`}
                  />
                  {errors.title && (
                    <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                    Deskripsi & Petunjuk
                  </label>
                  <textarea
                    rows={2}
                    {...register('description')}
                    placeholder="Deskripsi materi uji dan ketentuan peserta..."
                    className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                    Kategori
                  </label>
                  <select
                    {...register('category')}
                    className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                  >
                    <option value="cpns">CPNS / Sekolah Kedinasan</option>
                    <option value="sbmptn">UTBK-SNBT Kemendikbud</option>
                    <option value="iq">IQ Matrix Assessment</option>
                    <option value="custom">BUMN AKHLAK / Custom</option>
                  </select>
                </div>

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
                      className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
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
                      className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent font-mono"
                    />
                    {errors.passing_score_percentage && (
                      <p className="text-[11px] text-red-500 mt-0.5">{errors.passing_score_percentage.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Questions Header with Actions */}
              <div className="border-t border-borderline pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-ink flex items-center space-x-2">
                    <span>Daftar Butir Soal</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-surface border border-borderline">
                      {fields.length} Butir
                    </span>
                  </h4>
                  <p className="text-xs text-ink-muted">
                    Kelola redaksi pertanyaan, lampirkan media gambar, dan sesuaikan kunci jawaban.
                  </p>
                  {errors.questions && typeof errors.questions.message === 'string' && (
                    <p className="text-xs text-red-500 mt-1">{errors.questions.message}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={onOpenAIAssistant}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-accent/40 bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate dengan AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md border border-borderline bg-canvas text-ink text-xs font-medium hover:bg-surface-hover transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Soal</span>
                  </button>
                </div>
              </div>

              {/* Question Cards List */}
              <div className="space-y-6">
                {fields.map((field, idx) => (
                  <QuestionFormField
                    key={field.id}
                    index={idx}
                    onRemove={() => remove(idx)}
                    canRemove={fields.length > 1}
                  />
                ))}
              </div>

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
                  className="px-5 py-2 text-xs font-semibold rounded-md bg-accent text-white hover:opacity-95 shadow-xs transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan Perubahan...' : 'Simpan Pembaruan Ujian'}
                </button>
              </div>
            </form>
          </FormProvider>
        )}
      </div>
    </div>
  )
}
