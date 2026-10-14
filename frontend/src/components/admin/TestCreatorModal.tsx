import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useForm, FormProvider, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Test, Question } from '@/types'
import { TestFormSchema, TestFormValues } from '@/schemas/test.schema'
import { QuestionFormField } from '@/components/admin/QuestionFormField'
import { X, Plus, Sparkles } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

interface TestCreatorModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (testData: Omit<Test, 'id' | 'created_at' | 'updated_at'>, questions: Question[]) => Promise<void>
  onOpenAIAssistant: () => void
}

const DEFAULT_FORM_VALUES: TestFormValues = {
  title: '',
  description: '',
  category: 'cpns',
  duration_minutes: 25,
  passing_score_percentage: 65,
  published: true,
  questions: [
    {
      question_number: 1,
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
    },
  ],
}

export const TestCreatorModal: React.FC<TestCreatorModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onOpenAIAssistant,
}) => {
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

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  const handleAddQuestion = () => {
    append({
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
    try {
      const formattedQuestions: Question[] = values.questions.map((q, idx) => ({
        id: q.id || `q-new-${idx + 1}-${Date.now()}`,
        test_id: '',
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

      await onSubmit(
        {
          title: values.title.trim(),
          description: values.description?.trim() || '',
          category: values.category,
          duration_minutes: values.duration_minutes,
          passing_score_percentage: values.passing_score_percentage,
          total_questions: formattedQuestions.length,
          published: values.published,
        },
        formattedQuestions
      )

      toast.success('Modul Berhasil Dibuat', `"${values.title.trim()}" telah dipublikasikan ke bank soal.`)
      reset(DEFAULT_FORM_VALUES)
      onClose()
    } catch (err) {
      toast.error('Gagal Membuat Modul', (err as Error).message)
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60 dark:bg-black/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-surface border border-borderline rounded-lg max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-borderline pb-4">
          <div>
            <h3 className="text-lg font-semibold text-ink">Formulir Pembuatan Modul Ujian</h3>
            <p className="text-xs text-ink-muted">
              Definisikan parameter ujian dan susun butir-butir pertanyaan secara terstruktur.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-ink-muted hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Judul Ujian / Modul *
                </label>
                <input
                  type="text"
                  {...register('title')}
                  placeholder="Contoh: Tryout Nasional SKD CPNS 2026 - Paket A"
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
                  Deskripsi & Petunjuk Pengerjaan
                </label>
                <textarea
                  rows={2}
                  {...register('description')}
                  placeholder="Deskripsi singkat mengenai materi uji dan peraturan..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-borderline bg-canvas text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
                  Kategori Ujian
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

            {/* Questions Section Header with AI Generator Button */}
            <div className="border-t border-borderline pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-ink">
                  Daftar Butir Soal ({fields.length})
                </h4>
                <p className="text-xs text-ink-muted">
                  Tambahkan pilihan ganda atau esai lengkap dengan kunci & pembahasan.
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
                  <span>AI Generator Soal</span>
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

            {/* Questions Cards via useFieldArray */}
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

            {/* Modal Actions */}
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
                {isSubmitting ? 'Menyimpan Ujian...' : 'Simpan & Publikasikan Ujian'}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>,
    document.body
  )
}
