import { apiClient, AUTH_STORAGE_KEY } from './client'
import { Test, Question, AdminStats, EssaySubmission } from '@/types'

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
        shuffle_questions: testData.shuffle_questions,
        shuffle_answers: testData.shuffle_answers,
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
            option_letter: o.option_letter,
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
        shuffle_questions: testData.shuffle_questions,
        shuffle_answers: testData.shuffle_answers,
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
            option_letter: o.option_letter,
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
}
