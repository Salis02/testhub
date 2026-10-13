import { apiClient } from './client'
import { Question, TestSession, TestResult, UserSubmission } from '@/types'

export interface SessionQuestionsResponse {
  session_id?: string
  duration_minutes?: number
  test?: TestSession['test']
  questions: Question[]
}

export interface TestResultResponse {
  result: TestResult
  questions: Question[]
}

export const sessionsApi = {
  async startTest(testId: string): Promise<TestSession> {
    return apiClient<TestSession>(`/tests/${testId}/start`, {
      method: 'POST',
    })
  },

  async getSessionQuestions(sessionId: string, signal?: AbortSignal): Promise<SessionQuestionsResponse> {
    return apiClient<SessionQuestionsResponse>(`/sessions/${sessionId}/questions`, { signal })
  },

  async getSessionSubmissions(sessionId: string, signal?: AbortSignal): Promise<Record<string, UserSubmission>> {
    return apiClient<Record<string, UserSubmission>>(`/sessions/${sessionId}/submissions`, { signal })
  },

  // Alias for backward compatibility
  async getSubmissions(sessionId: string, signal?: AbortSignal): Promise<Record<string, UserSubmission>> {
    return this.getSessionSubmissions(sessionId, signal)
  },

  async submitAnswer(
    sessionId: string,
    questionId: string,
    payload: {
      optionId?: string
      answerText?: string
      isFlagged?: boolean
    }
  ): Promise<{ success: boolean; savedAt: string }> {
    return apiClient<{ success: boolean; savedAt: string }>(`/sessions/${sessionId}/submit-answer`, {
      method: 'POST',
      body: JSON.stringify({
        question_id: questionId,
        questionId: questionId,
        option_id: payload.optionId,
        optionId: payload.optionId,
        answer_text: payload.answerText,
        answerText: payload.answerText,
        is_flagged: payload.isFlagged,
        isFlagged: payload.isFlagged,
      }),
    })
  },

  async finishTest(sessionId: string, timeSpentSeconds: number): Promise<TestResult> {
    return apiClient<TestResult>(`/sessions/${sessionId}/finish`, {
      method: 'POST',
      body: JSON.stringify({
        time_spent_seconds: timeSpentSeconds,
      }),
    })
  },

  async getResult(resultId: string, signal?: AbortSignal): Promise<TestResultResponse> {
    return apiClient<TestResultResponse>(`/results/${resultId}`, { signal })
  },
}
