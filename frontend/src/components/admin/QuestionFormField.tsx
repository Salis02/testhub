import React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { TestFormValues } from '@/schemas/test.schema'
import { QuestionType } from '@/types'
import { MediaUploader } from '@/components/common/MediaUploader'
import { Trash2 } from 'lucide-react'

interface QuestionFormFieldProps {
  index: number
  onRemove: () => void
  canRemove: boolean
}

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

  return (
    <div className="p-5 rounded-lg border border-borderline bg-canvas space-y-4 transition-all">
      {/* Top Header of Question Card */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface border border-borderline text-ink">
            SOAL #{index + 1}
          </span>
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
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={questionType}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            className="px-2 py-1 text-xs rounded border border-borderline bg-surface text-ink font-mono focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="multiple_choice">Pilihan Ganda</option>
            <option value="essay">Esai</option>
          </select>

          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 text-ink-muted hover:text-red-500 rounded transition-colors"
              title="Hapus soal"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Question Text */}
      <div>
        <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
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
            label="Lampirkan Gambar/Diagram Soal"
          />
        )}
      />

      {/* Multiple Choice Options */}
      {questionType === 'multiple_choice' && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Opsi Jawaban & Kunci (Klik huruf untuk tandai benar):
            </span>
            {questionErrors?.options && (
              <span className="text-xs text-red-500">
                {questionErrors.options.message || 'Periksa pilihan jawaban'}
              </span>
            )}
          </div>

          {options.map((opt, optIndex) => {
            const isCorrect = opt.is_correct
            const optError = questionErrors?.options?.[optIndex]?.option_text

            return (
              <div key={opt.option_letter} className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleSelectCorrectOption(optIndex)}
                  className={`w-7 h-7 rounded font-mono text-xs flex items-center justify-center font-bold flex-shrink-0 transition-colors ${
                    isCorrect
                      ? 'bg-accent text-white shadow-xs'
                      : 'bg-surface border border-borderline text-ink-muted hover:text-ink'
                  }`}
                  title={isCorrect ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan kunci jawaban'}
                >
                  {opt.option_letter}
                </button>
                <div className="flex-1">
                  <input
                    type="text"
                    {...register(`questions.${index}.options.${optIndex}.option_text`)}
                    placeholder={`Jawaban opsi ${opt.option_letter}...`}
                    className={`w-full px-3 py-1.5 text-xs rounded border bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent ${
                      optError ? 'border-red-500' : 'border-borderline'
                    }`}
                  />
                  {optError && <p className="text-[11px] text-red-500 mt-0.5">{optError.message}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Explanation / Grading Criteria */}
      <div>
        <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
          Pembahasan / Kriteria Penilaian:
        </label>
        <input
          type="text"
          {...register(`questions.${index}.explanation`)}
          placeholder="Rasionalisasi kunci jawaban atau rubrik penilaian esai..."
          className="w-full px-3 py-1.5 text-xs rounded border border-borderline bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
    </div>
  )
}
