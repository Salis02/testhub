import { apiClient, BASE_URL, getStoredToken } from './client'
import { Question, TestCategory, DifficultyLevel } from '@/types'

export interface StreamChunkEvent {
  batch_index: number
  total_batches: number
  completed_count: number
  total_count: number
  provider: string
  questions: Question[]
}

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

  async streamGenerateQuestions(
    params: {
      category: TestCategory
      subject: string
      difficulty: DifficultyLevel
      count: number
      custom_prompt?: string
    },
    onChunk: (chunk: StreamChunkEvent) => void,
    signal?: AbortSignal
  ): Promise<Question[]> {
    const token = getStoredToken()
    const response = await fetch(`${BASE_URL}/ai/stream-generate-questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
      signal,
    })

    if (response.status === 404) {
      // Graceful fallback if backend server hasn't been restarted with the stream endpoint
      console.warn('[AI] Streaming endpoint 404, falling back to standard endpoint...')
      const fallbackQuestions = await aiApi.generateQuestions(params, signal)
      onChunk({
        batch_index: 1,
        total_batches: 1,
        completed_count: fallbackQuestions.length,
        total_count: fallbackQuestions.length,
        provider: 'Standard AI Generation (Fallback)',
        questions: fallbackQuestions,
      })
      return fallbackQuestions
    }

    if (!response.ok) {
      let errorMsg = `Server error ${response.status}`
      try {
        const errJson = await response.json()
        errorMsg = errJson.error || errorMsg
      } catch {
        // ignore
      }
      throw new Error(errorMsg)
    }

    if (!response.body) {
      throw new Error('Streaming response body tidak didukung oleh browser.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const accumulated: Question[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const block of lines) {
        if (!block.trim()) continue
        const eventMatch = block.match(/event:\s*(.+)/)
        const dataMatch = block.match(/data:\s*(.+)/)
        const event = eventMatch ? eventMatch[1].trim() : 'message'
        const rawData = dataMatch ? dataMatch[1].trim() : ''

        if (event === 'chunk' && rawData) {
          const parsed: StreamChunkEvent = JSON.parse(rawData)
          const formattedQuestions = (parsed.questions || []).map((q) => ({
            ...q,
            options: q.options || [],
          }))
          accumulated.push(...formattedQuestions)
          onChunk({
            ...parsed,
            questions: formattedQuestions,
          })
        } else if (event === 'error' && rawData) {
          const parsed = JSON.parse(rawData)
          throw new Error(parsed.error || 'Terjadi kesalahan saat stream AI.')
        }
      }
    }

    return accumulated
  },
}
