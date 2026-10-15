import React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { TestFormValues } from '@/schemas/test.schema'
import { QuestionType, DifficultyLevel } from '@/types'
import { MediaUploader } from '@/components/common/MediaUploader'
import { Trash2, Plus, XCircle } from 'lucide-react'

interface QuestionFormFieldProps {
  index: number
  onRemove: () => void
  canRemove: boolean
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const

const DEFAULT_OPTIONS = [
  { option_letter: 'A' as const, option_text: '', is_correct: true },
  { option_letter: 'B' as const, option_text: '', is_correct: false },
  { option_letter: 'C' as const, option_text: '', is_correct: false },
  { option_letter: 'D' as const, option_text: '', is_correct: false },
]

export const QuestionFormField: React.FC<QuestionFormFieldProps> = ({
  index,
  onRemove,
  canRemove,
}) => {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<TestFormValues>()

  const questionType = watch(`questions.${index}.question_type`)
  const difficultyLevel = watch(`questions.${index}.difficulty_level`)
  const options = watch(`questions.${index}.options`) || []
  const questionErrors = errors.questions?.[index]

  const handleTypeChange = (newType: QuestionType) => {
    setValue(`questions.${index}.question_type`, newType, { shouldValidate: true })
    if (newType === 'multiple_choice' && (!options || options.length === 0)) {
      setValue(`questions.${index}.options`, DEFAULT_OPTIONS, { shouldValidate: true })
    }
  }

  const handleSelectCorrectOption = (optIndex: number) => {
    const updatedOptions = options.map((opt, idx) => ({
      ...opt,
      is_correct: idx === optIndex,
    }))
    setValue(`questions.${index}.options`, updatedOptions, { shouldValidate: true })
  }

  const handleAddOption = () => {
    if (options.length >= 5) return
    const nextLetter = OPTION_LETTERS[options.length]
    const updated = [
      ...options,
      {
        option_letter: nextLetter,
        option_text: '',
        is_correct: false,
      },
    ]
    setValue(`questions.${index}.options`, updated, { shouldValidate: true })
  }

  const handleRemoveOption = (optIndexToRemove: number) => {
    if (options.length <= 2) return
    const filtered = options.filter((_, idx) => idx !== optIndexToRemove)
    // Re-index letters A, B, C...
    const reindexed = filtered.map((opt, idx) => ({
      ...opt,
      option_letter: OPTION_LETTERS[idx],
    }))
    // Ensure at least one correct option exists
    if (!reindexed.some((o) => o.is_correct)) {
      reindexed[0].is_correct = true
    }
    setValue(`questions.${index}.options`, reindexed, { shouldValidate: true })
  }

  return (
    <div className="p-5 rounded-lg border border-borderline bg-canvas space-y-4 transition-all shadow-xs">
      {/* Top Header of Question Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-borderline pb-3">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-surface border border-borderline text-ink shadow-xs">
            SOAL #{index + 1}
          </span>

          {/* Points / Score */}
          <div className="flex items-center space-x-1.5">
            <label className="text-[11px] text-ink-muted font-medium">Bobot:</label>
            <input
              type="number"
              min={1}
              max={100}
              {...register(`questions.${index}.points`, { valueAsNumber: true })}
              className="w-14 px-1.5 py-0.5 text-xs rounded border border-borderline bg-surface text-ink font-mono text-center focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <span className="text-[11px] text-ink-muted">poin</span>
          </div>

          {/* Difficulty Level Selector */}
          <div className="flex items-center space-x-1.5">
            <label className="text-[11px] text-ink-muted font-medium">Tingkat:</label>
            <select
              {...register(`questions.${index}.difficulty_level`)}
              className="px-2 py-0.5 text-xs rounded border border-borderline bg-surface text-ink font-medium focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="easy">🟢 Mudah</option>
              <option value="medium">🟡 Sedang</option>
              <option value="hard">🔴 Sulit</option>
            </select>
          </div>
        </div>

        {/* Question Type & Actions */}
        <div className="flex items-center space-x-2">
          <select
            value={questionType}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            className="px-2.5 py-1 text-xs rounded border border-borderline bg-surface text-ink font-semibold focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="multiple_choice">Pilihan Ganda</option>
            <option value="essay">Esai / Uraian</option>
            <option value="matching">Menjodohkan</option>
          </select>

          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 text-ink-muted hover:text-red-500 hover:bg-surface rounded transition-colors"
              title="Hapus butir soal ini"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div>
        <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
          Redaksi Pertanyaan *
        </label>
        <textarea
          rows={3}
          {...register(`questions.${index}.question_text`)}
          placeholder={`Tuliskan teks pertanyaan soal #${index + 1}...`}
          className={`w-full px-3 py-2 text-sm rounded-md border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent ${
            questionErrors?.question_text ? 'border-red-500' : 'border-borderline'
          }`}
        />
        {questionErrors?.question_text && (
          <p className="text-xs text-red-500 mt-1">{questionErrors.question_text.message}</p>
        )}
      </div>

      {/* Media Image Attachment */}
      <Controller
        name={`questions.${index}.media_url`}
        control={control}
        render={({ field }) => (
          <MediaUploader
            mediaUrl={field.value || null}
            onChange={(url) => field.onChange(url)}
            label="Lampirkan Gambar / Diagram Butir Soal"
          />
        )}
      />

      {/* Multiple Choice Options */}
      {questionType === 'multiple_choice' && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Pilihan Jawaban (Klik huruf untuk tandai kunci benar):
            </span>
            {questionErrors?.options && (
              <span className="text-xs text-red-500">
                {questionErrors.options.message || 'Periksa pilihan jawaban'}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {options.map((opt, optIndex) => {
              const isCorrect = opt.is_correct
              const optError = questionErrors?.options?.[optIndex]?.option_text

              return (
                <div key={opt.option_letter} className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleSelectCorrectOption(optIndex)}
                    className={`w-8 h-8 rounded-md font-mono text-xs flex items-center justify-center font-bold flex-shrink-0 transition-all ${
                      isCorrect
                        ? 'bg-accent text-white shadow-sm ring-2 ring-accent/30'
                        : 'bg-surface border border-borderline text-ink-muted hover:text-ink hover:border-accent/50'
                    }`}
                    title={isCorrect ? 'Kunci Jawaban Benar (Aktif)' : 'Klik untuk jadikan kunci jawaban'}
                  >
                    {opt.option_letter}
                  </button>

                  <div className="flex-1">
                    <input
                      type="text"
                      {...register(`questions.${index}.options.${optIndex}.option_text`)}
                      placeholder={`Jawaban opsi ${opt.option_letter}...`}
                      className={`w-full px-3 py-1.5 text-xs rounded-md border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent ${
                        optError ? 'border-red-500' : 'border-borderline'
                      }`}
                    />
                    {optError && <p className="text-[11px] text-red-500 mt-0.5">{optError.message}</p>}
                  </div>

                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(optIndex)}
                      className="p-1 text-ink-muted hover:text-red-500 rounded transition-colors"
                      title={`Hapus opsi ${opt.option_letter}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add Option Button (up to 5 options: A-E) */}
          {options.length < 5 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-accent hover:bg-accent/10 rounded border border-dashed border-accent/40 transition-colors mt-1"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah Opsi ({OPTION_LETTERS[options.length]})</span>
            </button>
          )}
        </div>
      )}

      {/* Explanation / Grading Criteria */}
      <div>
        <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1">
          Pembahasan & Kriteria Penilaian / Rubrik:
        </label>
        <textarea
          rows={2}
          {...register(`questions.${index}.explanation`)}
          placeholder="Tuliskan rasionalisasi kunci jawaban, rumus solusi, atau kriteria penilaian esai..."
          className="w-full px-3 py-1.5 text-xs rounded-md border border-borderline bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  )
}
