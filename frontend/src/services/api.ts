/**
 * TestHub API Facade & Service Index
 * Enterprise Layer: Modular domain APIs backed by core apiClient
 */

export * from './client'
export * from './tests.api'
export * from './sessions.api'
export * from './admin.api'
export * from './ai.api'
export * from './auth.api'

import { testsApi } from './tests.api'
import { sessionsApi } from './sessions.api'
import { adminApi } from './admin.api'
import { aiApi } from './ai.api'
import { authApi } from './auth.api'

// No-op for legacy startup hooks (eliminates localStorage dual-backend drift)
export function initLocalStorage(): void {
  // Clean architecture: PostgreSQL/Redis is the single source of truth
}

/**
 * Unified `api` facade providing seamless backward-compatibility
 * for existing components while delegating to domain-specific services.
 */
export const api = {
  // 1. Tests Management
  listTests: testsApi.listTests,
  getTestById: testsApi.getTestById,

  // 2. Test Taking Flow
  startTest: sessionsApi.startTest,
  getSessionQuestions: sessionsApi.getSessionQuestions,
  getSessionSubmissions: sessionsApi.getSessionSubmissions,
  getSubmissions: sessionsApi.getSubmissions,
  submitAnswer: sessionsApi.submitAnswer,
  finishTest: sessionsApi.finishTest,
  getResult: sessionsApi.getResult,

  // 3. Authentication & Profile
  adminLogin: authApi.login,
  adminRegister: authApi.register,
  getCurrentUser: authApi.me,
  logout: authApi.logout,

  // 4. Admin Management
  getAdminStats: adminApi.getStats,
  adminCreateTest: adminApi.createTest,
  getAdminTest: adminApi.getTest,
  updateAdminTest: adminApi.updateTest,
  adminTogglePublish: adminApi.togglePublish,
  adminDeleteTest: adminApi.deleteTest,
  adminGetPendingEssays: adminApi.getPendingEssays,
  adminGradeEssay: adminApi.gradeEssay,
  uploadMedia: adminApi.uploadMedia,
  deleteMedia: adminApi.deleteMedia,

  // 5. AI Assistant
  generateQuestionsAI: aiApi.generateQuestions,
  streamGenerateQuestionsAI: aiApi.streamGenerateQuestions,
}

export default api
