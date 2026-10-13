import { apiClient } from './client'
import { Test } from '@/types'

export const testsApi = {
  async listTests(category?: string, query?: string, signal?: AbortSignal): Promise<Test[]> {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.set('category', category)
    if (query && query.trim()) params.set('query', query.trim())

    const queryString = params.toString() ? `?${params.toString()}` : ''
    return apiClient<Test[]>(`/tests${queryString}`, { signal })
  },

  async getTestById(testId: string, signal?: AbortSignal): Promise<Test> {
    return apiClient<Test>(`/tests/${testId}`, { signal })
  },
}
