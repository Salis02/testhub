import { z } from 'zod'

export const OptionSchema = z.object({
  id: z.string().optional(),
  option_letter: z.enum(['A', 'B', 'C', 'D', 'E']),
  option_text: z.string().min(1, 'Teks pilihan jawaban tidak boleh kosong'),
  is_correct: z.boolean().default(false),
})

export const QuestionSchema = z
  .object({
    id: z.string().optional(),
    test_id: z.string().optional(),
    question_number: z.number().default(1),
    question_text: z.string().min(5, 'Teks pertanyaan minimal 5 karakter'),
    question_type: z.enum(['multiple_choice', 'essay', 'matching']).default('multiple_choice'),
    difficulty_level: z.enum(['easy', 'medium', 'hard']).default('medium'),
    points: z.number().min(1, 'Bobot minimal 1 poin').max(100, 'Bobot maksimal 100 poin').default(5),
    explanation: z.string().optional().default(''),
    media_url: z.string().nullable().optional(),
    options: z.array(OptionSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.question_type === 'multiple_choice') {
      if (data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Soal pilihan ganda harus memiliki minimal 2 pilihan jawaban',
          path: ['options'],
        })
      }
      const correctCount = data.options.filter((o) => o.is_correct).length
      if (correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Tepat harus ada 1 kunci jawaban yang ditandai benar',
          path: ['options'],
        })
      }
    }
  })

export const TestFormSchema = z.object({
  title: z
    .string()
    .min(4, 'Judul ujian minimal 4 karakter')
    .max(150, 'Judul ujian maksimal 150 karakter'),
  description: z.string().optional().default(''),
  category: z.enum(['cpns', 'sbmptn', 'iq', 'custom']).default('cpns'),
  duration_minutes: z
    .number()
    .min(5, 'Durasi minimal 5 menit')
    .max(300, 'Durasi maksimal 300 menit')
    .default(25),
  passing_score_percentage: z
    .number()
    .min(1, 'Passing score minimal 1%')
    .max(100, 'Passing score maksimal 100%')
    .default(65),
  price_idr: z
    .number()
    .min(0, 'Harga tidak boleh negatif')
    .default(0),
  shuffle_questions: z.boolean().default(false),
  shuffle_answers: z.boolean().default(false),
  published: z.boolean().default(true),
  require_fullscreen: z.boolean().default(false),
  detect_tab_switch: z.boolean().default(false),
  block_copy_paste: z.boolean().default(false),
  max_violations: z.number().min(1, 'Minimal 1 kali pelanggaran').max(10, 'Maksimal 10 kali pelanggaran').default(3),
  questions: z
    .array(QuestionSchema)
    .min(1, 'Modul ujian harus memiliki minimal 1 butir soal'),
})

export type OptionFormValues = z.infer<typeof OptionSchema>
export type QuestionFormValues = z.infer<typeof QuestionSchema>
export type TestFormValues = z.infer<typeof TestFormSchema>
