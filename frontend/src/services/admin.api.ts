import { apiClient, AUTH_STORAGE_KEY } from './client'
import { Test, Question, AdminStats, EssaySubmission, TestAnalytics } from '@/types'

export const adminApi = {
  async getStats(signal?: AbortSignal): Promise<AdminStats> {
    return apiClient<AdminStats>('/admin/stats', { signal })
  },

  async listTests(signal?: AbortSignal): Promise<Test[]> {
    return apiClient<Test[]>('/admin/tests', { signal })
  },

  async getTest(testId: string, signal?: AbortSignal): Promise<{ test: Test; questions: Question[] }> {
    return apiClient<{ test: Test; questions: Question[] }>(`/admin/tests/${testId}`, { signal })
  },

  async createTest(testData: Partial<Test>, questions: Question[]): Promise<Test> {
    return apiClient<Test>('/admin/tests', {
      method: 'POST',
      body: JSON.stringify({
        title: testData.title,
        description: testData.description,
        category: testData.category,
        duration_minutes: testData.duration_minutes,
        passing_score_percentage: testData.passing_score_percentage,
        price_idr: testData.price_idr ?? 0,
        shuffle_questions: Boolean(testData.shuffle_questions),
        shuffle_answers: Boolean(testData.shuffle_answers),
        published: testData.published,
        questions: questions.map((q, idx) => ({
          question_number: idx + 1,
          question_text: q.question_text,
          question_type: q.question_type || 'multiple_choice',
          media_url: q.media_url || null,
          difficulty_level: q.difficulty_level || 'medium',
          explanation: q.explanation || '',
          points: q.points || 5,
          options: (q.options || []).map((o) => ({
            option_letter: (o.option_letter || 'A').toUpperCase(),
            option_text: o.option_text,
            is_correct: !!o.is_correct,
          })),
        })),
      }),
    })
  },

  async updateTest(
    testId: string,
    testData: Partial<Test>,
    questions?: Question[]
  ): Promise<Test> {
    return apiClient<Test>(`/admin/tests/${testId}`, {
      method: 'PUT',
      body: JSON.stringify({
        title: testData.title,
        description: testData.description,
        category: testData.category,
        duration_minutes: testData.duration_minutes,
        passing_score_percentage: testData.passing_score_percentage,
        price_idr: testData.price_idr ?? 0,
        shuffle_questions: Boolean(testData.shuffle_questions),
        shuffle_answers: Boolean(testData.shuffle_answers),
        published: testData.published,
        questions: questions?.map((q, idx) => ({
          question_number: idx + 1,
          question_text: q.question_text,
          question_type: q.question_type || 'multiple_choice',
          media_url: q.media_url || null,
          difficulty_level: q.difficulty_level || 'medium',
          explanation: q.explanation || '',
          points: q.points || 5,
          options: (q.options || []).map((o) => ({
            option_letter: (o.option_letter || 'A').toUpperCase(),
            option_text: o.option_text,
            is_correct: !!o.is_correct,
          })),
        })),
      }),
    })
  },

  async deleteTest(testId: string): Promise<boolean> {
    await apiClient(`/admin/tests/${testId}`, {
      method: 'DELETE',
    })
    return true
  },

  async togglePublish(testId: string): Promise<boolean> {
    const res = await apiClient<{ published: boolean }>(`/admin/tests/${testId}/toggle-publish`, {
      method: 'POST',
    })
    return res.published
  },

  async getPendingEssays(signal?: AbortSignal): Promise<EssaySubmission[]> {
    return apiClient<EssaySubmission[]>('/admin/essays', { signal })
  },

  async gradeEssay(essayId: string, score: number, note: string): Promise<boolean> {
    await apiClient(`/admin/essays/${essayId}/grade`, {
      method: 'POST',
      body: JSON.stringify({ score, note }),
    })
    return true
  },

  async uploadMedia(file: File): Promise<{ url: string; filename: string; size_bytes: number; content_type: string }> {
    const formData = new FormData()
    formData.append('file', file)

    return apiClient<{ url: string; filename: string; size_bytes: number; content_type: string }>(
      '/admin/upload-media',
      {
        method: 'POST',
        body: formData,
      }
    )
  },

  async deleteMedia(url: string): Promise<boolean> {
    await apiClient(`/admin/media?url=${encodeURIComponent(url)}`, {
      method: 'DELETE',
    })
    return true
  },

  async listSubscriptions(
    params?: { status?: string; search?: string; limit?: number; offset?: number },
    signal?: AbortSignal
  ): Promise<{ subscriptions: import('@/types').Subscription[]; total: number; limit: number; offset: number }> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))

    const query = searchParams.toString()
    return apiClient(`/admin/subscriptions${query ? `?${query}` : ''}`, { signal })
  },

  async manualGrantSubscription(data: import('@/types').ManualGrantDTO): Promise<import('@/types').Subscription> {
    return apiClient<import('@/types').Subscription>('/admin/subscriptions/manual-grant', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async updateSubscriptionStatus(
    id: string,
    data: import('@/types').UpdateSubscriptionStatusDTO
  ): Promise<boolean> {
    await apiClient(`/admin/subscriptions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    return true
  },

  async revokeSubscription(id: string, reason?: string): Promise<boolean> {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : ''
    await apiClient(`/admin/subscriptions/${id}/revoke${query}`, {
      method: 'DELETE',
    })
    return true
  },

  async getTestAnalytics(testId: string, signal?: AbortSignal): Promise<TestAnalytics> {
    return apiClient<TestAnalytics>(`/admin/tests/${testId}/analytics`, { signal })
  },

  async getAuditLogs(
    params?: { limit?: number; offset?: number },
    signal?: AbortSignal
  ): Promise<import('@/types').AdminAuditLog[]> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.offset) searchParams.set('offset', String(params.offset))
    const query = searchParams.toString()
    return apiClient<import('@/types').AdminAuditLog[]>(`/admin/audit-logs${query ? `?${query}` : ''}`, { signal })
  },
}

