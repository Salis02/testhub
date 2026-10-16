import { apiClient } from './client'
import { Question, TestCategory, DifficultyLevel } from '@/types'

export const aiApi = {
  async generateQuestions(
    params: {
      category: TestCategory
      subject: string
      difficulty: DifficultyLevel
      count: number
      custom_prompt?: string
    },
    signal?: AbortSignal
  ): Promise<Question[]> {
    const data = await apiClient<Question[]>('/ai/generate-questions', {
      method: 'POST',
      body: JSON.stringify(params),
      signal,
    })

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Layanan AI tidak mengembalikan butir soal yang valid.')
    }

    return data.map((q: Question) => ({
      ...q,
      options: q.options || [],
    }))
  },
}
