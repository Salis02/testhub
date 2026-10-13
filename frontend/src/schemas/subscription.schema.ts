import { z } from 'zod'

export const ManualGrantSchema = z
  .object({
    user_identifier: z
      .string()
      .min(3, 'Email / Identitas pengguna minimal 3 karakter')
      .email('Format email peserta tidak valid'),
    plan_type: z.enum(['per_test', 'season_pass']),
    test_id: z.string().optional().nullable(),
    valid_days: z
      .number()
      .min(1, 'Minimal masa aktif 1 hari')
      .max(365, 'Maksimal masa aktif 365 hari')
      .default(30),
    reason_notes: z
      .string()
      .min(5, 'Catatan alasan audit minimal 5 karakter (contoh: Deal MoU B2B, transfer bank offline, voucher)'),
  })
  .refine(
    (data) => {
      if (data.plan_type === 'per_test') {
        return !!data.test_id && data.test_id.trim().length > 0
      }
      return true
    },
    {
      message: 'ID modul ujian wajib dipilih jika memilih paket Per-Test',
      path: ['test_id'],
    }
  )

export type ManualGrantFormValues = z.infer<typeof ManualGrantSchema>

export const ExtendSubscriptionSchema = z.object({
  extend_days: z.number().min(1, 'Minimal perpanjangan 1 hari').max(365, 'Maksimal 365 hari').default(30),
  admin_notes: z.string().optional().default(''),
})

export type ExtendSubscriptionFormValues = z.infer<typeof ExtendSubscriptionSchema>
