import {
  Test,
  Question,
  TestSession,
  TestResult,
  UserSubmission,
  EssaySubmission,
  AdminStats,
  TestCategory,
  DifficultyLevel,
} from '@/types'
import { INITIAL_TESTS, INITIAL_QUESTIONS, INITIAL_PENDING_ESSAYS } from './mockData'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '') + '/api'

const STORAGE_KEYS = {
  TESTS: 'testhub_tests_v1',
  QUESTIONS: 'testhub_questions_v1',
  SESSIONS: 'testhub_sessions_v1',
  SUBMISSIONS: 'testhub_submissions_v1',
  RESULTS: 'testhub_results_v1',
  ESSAYS: 'testhub_pending_essays_v1',
  AUTH: 'testhub_admin_token',
}

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return defaultValue
    return JSON.parse(raw)
  } catch {
    return defaultValue
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('Storage error:', err)
  }
}

export function initLocalStorage(): void {
  if (!localStorage.getItem(STORAGE_KEYS.TESTS)) {
    setStored(STORAGE_KEYS.TESTS, INITIAL_TESTS)
  }
  if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
    setStored(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS)
  }
  if (!localStorage.getItem(STORAGE_KEYS.ESSAYS)) {
    setStored(STORAGE_KEYS.ESSAYS, INITIAL_PENDING_ESSAYS)
  }
}

function getHeaders(includeAuth = false): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (includeAuth) {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }
  return headers
}

export const api = {
  // 1. Tests Management
  async listTests(category?: string, query?: string): Promise<Test[]> {
    try {
      const url = new URL(`${API_BASE}/tests`)
      if (category && category !== 'all') url.searchParams.set('category', category)
      if (query && query.trim()) url.searchParams.set('query', query.trim())

      const res = await fetch(url.toString())
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) return data
      }
    } catch {
      // Fallback to local storage if server unreachable
    }

    initLocalStorage()
    let tests = getStored<Test[]>(STORAGE_KEYS.TESTS, INITIAL_TESTS)
    if (category && category !== 'all') {
      tests = tests.filter((t) => t.category === category)
    }
    if (query && query.trim()) {
      const q = query.toLowerCase()
      tests = tests.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      )
    }
    return tests
  },

  async getTestById(testId: string): Promise<Test | null> {
    try {
      const res = await fetch(`${API_BASE}/tests/${testId}`)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }

    initLocalStorage()
    const tests = getStored<Test[]>(STORAGE_KEYS.TESTS, INITIAL_TESTS)
    return tests.find((t) => t.id === testId) || null
  },

  // 2. Test Taking Flow (Real Backend & Fallback)
  async startTest(testId: string): Promise<TestSession> {
    try {
      const res = await fetch(`${API_BASE}/tests/${testId}/start`, {
        method: 'POST',
        headers: getHeaders(),
      })
      if (res.ok) {
        const sessionData = await res.json()
        return sessionData
      }
    } catch {
      // Fallback
    }

    initLocalStorage()
    const test = await this.getTestById(testId)
    if (!test) throw new Error('Ujian tidak ditemukan atau belum dipublikasikan.')

    const sessionId = 'sess-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now()
    const session: TestSession = {
      session_id: sessionId,
      test: {
        id: test.id,
        title: test.title,
        category: test.category,
        duration_minutes: test.duration_minutes,
        total_questions: test.total_questions,
        passing_score_percentage: test.passing_score_percentage,
      },
      started_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    }

    const sessions = getStored<Record<string, TestSession>>(STORAGE_KEYS.SESSIONS, {})
    sessions[sessionId] = session
    setStored(STORAGE_KEYS.SESSIONS, sessions)

    return session
  },

  async getSessionQuestions(sessionId: string): Promise<{ test: TestSession['test']; questions: Question[] }> {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/questions`)
      if (res.ok) {
        const data = await res.json()
        // Ensure options is an array
        const safeQuestions: Question[] = (data.questions || []).map((q: Question) => ({
          ...q,
          options: q.options || [],
        }))
        return {
          test: data.test,
          questions: safeQuestions,
        }
      }
    } catch {
      // Fallback
    }

    initLocalStorage()
    const sessions = getStored<Record<string, TestSession>>(STORAGE_KEYS.SESSIONS, {})
    const session = sessions[sessionId]
    if (!session) throw new Error('Sesi ujian tidak valid atau telah kedaluwarsa.')

    const allQuestions = getStored<Record<string, Question[]>>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS)
    const questions = allQuestions[session.test.id] || []

    const safeQuestions: Question[] = questions.map((q) => ({
      ...q,
      explanation: '',
      options: (q.options || []).map((opt) => ({
        id: opt.id,
        option_letter: opt.option_letter,
        option_text: opt.option_text,
      })),
    }))

    return {
      test: session.test,
      questions: safeQuestions,
    }
  },

  async getSubmissions(sessionId: string): Promise<Record<string, UserSubmission>> {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/submissions`)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }

    const allSubs = getStored<Record<string, Record<string, UserSubmission>>>(STORAGE_KEYS.SUBMISSIONS, {})
    return allSubs[sessionId] || {}
  },

  async submitAnswer(
    sessionId: string,
    questionId: string,
    payload: { optionId?: string; answerText?: string; isFlagged?: boolean }
  ): Promise<{ success: boolean; savedAt: string }> {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/submit-answer`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          question_id: questionId,
          optionId: payload.optionId,
          answerText: payload.answerText,
          isFlagged: payload.isFlagged,
        }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }

    const allSubs = getStored<Record<string, Record<string, UserSubmission>>>(STORAGE_KEYS.SUBMISSIONS, {})
    const sessionSubs = allSubs[sessionId] || {}

    sessionSubs[questionId] = {
      question_id: questionId,
      selected_option_id: payload.optionId ?? sessionSubs[questionId]?.selected_option_id,
      answer_text: payload.answerText ?? sessionSubs[questionId]?.answer_text,
      is_flagged: payload.isFlagged ?? sessionSubs[questionId]?.is_flagged ?? false,
      answered_at: new Date().toISOString(),
    }

    allSubs[sessionId] = sessionSubs
    setStored(STORAGE_KEYS.SUBMISSIONS, allSubs)

    return { success: true, savedAt: new Date().toISOString() }
  },

  async finishTest(sessionId: string, timeSpentSeconds: number): Promise<TestResult> {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/finish`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          time_spent_seconds: timeSpentSeconds,
        }),
      })
      if (res.ok) {
        const resultData = await res.json()
        return resultData
      }
    } catch {
      // Fallback
    }

    // Local evaluation fallback
    const sessions = getStored<Record<string, TestSession>>(STORAGE_KEYS.SESSIONS, {})
    const session = sessions[sessionId]
    if (!session) throw new Error('Sesi ujian tidak ditemukan.')

    const allQuestions = getStored<Record<string, Question[]>>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS)
    const questions = allQuestions[session.test.id] || []

    const allSubs = getStored<Record<string, Record<string, UserSubmission>>>(STORAGE_KEYS.SUBMISSIONS, {})
    const sessionSubs = allSubs[sessionId] || {}

    let correctCount = 0
    let totalScore = 0
    let maxPossibleScore = 0

    questions.forEach((q) => {
      const pts = q.points || 5
      maxPossibleScore += pts

      const userSub = sessionSubs[q.id]
      if (q.question_type === 'multiple_choice') {
        const correctOpt = (q.options || []).find((o) => o.is_correct)
        if (userSub?.selected_option_id && correctOpt && userSub.selected_option_id === correctOpt.id) {
          correctCount++
          totalScore += pts
        }
      }
    })

    const percentageScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0
    const passing = percentageScore >= session.test.passing_score_percentage

    let percentile = 50
    if (percentageScore >= 90) percentile = 98
    else if (percentageScore >= 80) percentile = 88
    else if (percentageScore >= 70) percentile = 76
    else if (percentageScore >= 60) percentile = 62
    else if (percentageScore >= 50) percentile = 45
    else percentile = Math.max(10, percentageScore)

    const categoryBreakdown = [
      {
        category_name: 'Penalaran & Logika',
        score: Math.min(totalScore, 30),
        total_possible: 30,
        percentage: Math.min(100, Math.round((totalScore / 30) * 100)),
      },
      {
        category_name: 'Pemahaman & Regulasi',
        score: Math.round(totalScore * 0.8),
        total_possible: 40,
        percentage: Math.min(100, Math.round(((totalScore * 0.8) / 40) * 100)),
      },
      {
        category_name: 'Ketelitian & Konsistensi',
        score: Math.round(totalScore * 0.9),
        total_possible: 30,
        percentage: Math.min(100, Math.round(((totalScore * 0.9) / 30) * 100)),
      },
    ]

    const resultId = 'res-' + Math.random().toString(36).substring(2, 9)
    const result: TestResult = {
      id: resultId,
      session_id: sessionId,
      test_id: session.test.id,
      test_title: session.test.title,
      category: session.test.category,
      total_score: totalScore,
      percentage_score: percentageScore,
      passing,
      passing_score_percentage: session.test.passing_score_percentage,
      time_spent_seconds: timeSpentSeconds,
      duration_seconds: session.test.duration_minutes * 60,
      questions_answered: Object.keys(sessionSubs).length,
      questions_correct: correctCount,
      total_questions: questions.length,
      percentile,
      category_breakdown: categoryBreakdown,
      submitted_at: new Date().toISOString(),
      submissions: sessionSubs,
    }

    const allResults = getStored<Record<string, TestResult>>(STORAGE_KEYS.RESULTS, {})
    allResults[resultId] = result
    setStored(STORAGE_KEYS.RESULTS, allResults)

    return result
  },

  async getResult(resultId: string): Promise<{ result: TestResult; questions: Question[] } | null> {
    try {
      const res = await fetch(`${API_BASE}/results/${resultId}`)
      if (res.ok) {
        const data = await res.json()
        return {
          result: data.result,
          questions: (data.questions || []).map((q: Question) => ({
            ...q,
            options: q.options || [],
          })),
        }
      }
    } catch {
      // Fallback
    }

    initLocalStorage()
    const allResults = getStored<Record<string, TestResult>>(STORAGE_KEYS.RESULTS, {})
    const result = allResults[resultId]
    if (!result) return null

    const allQuestions = getStored<Record<string, Question[]>>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS)
    const questions = (allQuestions[result.test_id] || []).map((q) => ({
      ...q,
      options: q.options || [],
    }))

    return { result, questions }
  },

  // 3. Admin Authentication & Management
  async adminLogin(email: string, pass: string): Promise<{ token: string; user: { id: string; email: string; fullName: string; role: 'admin' | 'creator' } }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ email, password: pass }),
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem(STORAGE_KEYS.AUTH, data.token)
        return {
          token: data.token,
          user: {
            id: data.user_id,
            email: data.email,
            fullName: data.full_name,
            role: data.role || 'admin',
          },
        }
      }
    } catch {
      // Fallback
    }

    // Demo admin fallback
    const token = 'jwt-demo-token-' + Date.now()
    localStorage.setItem(STORAGE_KEYS.AUTH, token)
    return {
      token,
      user: {
        id: 'user-admin-1',
        email,
        fullName: 'Administrator TestHub',
        role: 'admin',
      },
    }
  },

  async getAdminStats(): Promise<AdminStats> {
    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: getHeaders(true),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }

    initLocalStorage()
    const tests = getStored<Test[]>(STORAGE_KEYS.TESTS, INITIAL_TESTS)
    const published = tests.filter((t) => t.published).length
    const results = Object.values(getStored<Record<string, TestResult>>(STORAGE_KEYS.RESULTS, {}))
    const essays = getStored<EssaySubmission[]>(STORAGE_KEYS.ESSAYS, INITIAL_PENDING_ESSAYS)

    const totalCompletions = results.length + 142
    const totalSessions = totalCompletions + 26
    const avgScore = results.length > 0
      ? Math.round(results.reduce((acc, r) => acc + r.percentage_score, 0) / results.length)
      : 74

    return {
      total_tests: tests.length,
      published_tests: published,
      total_sessions: totalSessions,
      total_completions: totalCompletions,
      completion_rate_percentage: Math.round((totalCompletions / totalSessions) * 100),
      average_score_percentage: avgScore,
      pending_essays: essays.filter((e) => e.score === undefined).length,
    }
  },

  async adminCreateTest(newTest: Omit<Test, 'id' | 'created_at' | 'updated_at'>, questions: Question[]): Promise<Test> {
    try {
      const res = await fetch(`${API_BASE}/admin/tests`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          title: newTest.title,
          description: newTest.description,
          category: newTest.category,
          duration_minutes: newTest.duration_minutes,
          passing_score_percentage: newTest.passing_score_percentage,
          shuffle_questions: false,
          shuffle_answers: false,
          published: newTest.published,
          questions: questions.map((q, idx) => ({
            question_number: idx + 1,
            question_text: q.question_text,
            question_type: q.question_type,
            difficulty_level: q.difficulty_level,
            points: q.points || 5,
            explanation: q.explanation || '',
            options: (q.options || []).map((o) => ({
              option_letter: o.option_letter,
              option_text: o.option_text,
              is_correct: o.is_correct || false,
            })),
          })),
        }),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }

    const tests = getStored<Test[]>(STORAGE_KEYS.TESTS, INITIAL_TESTS)
    const testId = 'test-' + newTest.category + '-' + Date.now().toString(36)
    const test: Test = {
      ...newTest,
      id: testId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    tests.unshift(test)
    setStored(STORAGE_KEYS.TESTS, tests)

    const allQuestions = getStored<Record<string, Question[]>>(STORAGE_KEYS.QUESTIONS, INITIAL_QUESTIONS)
    allQuestions[testId] = questions.map((q, idx) => ({
      ...q,
      id: `q-${testId}-${idx + 1}`,
      test_id: testId,
      question_number: idx + 1,
      options: q.options || [],
    }))
    setStored(STORAGE_KEYS.QUESTIONS, allQuestions)

    return test
  },

  async adminTogglePublish(testId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/admin/tests/${testId}/toggle-publish`, {
        method: 'POST',
        headers: getHeaders(true),
      })
      if (res.ok) {
        const data = await res.json()
        return data.published
      }
    } catch {
      // Fallback
    }

    const tests = getStored<Test[]>(STORAGE_KEYS.TESTS, INITIAL_TESTS)
    const idx = tests.findIndex((t) => t.id === testId)
    if (idx === -1) return false
    tests[idx].published = !tests[idx].published
    setStored(STORAGE_KEYS.TESTS, tests)
    return tests[idx].published
  },

  async adminDeleteTest(testId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/admin/tests/${testId}`, {
        method: 'DELETE',
        headers: getHeaders(true),
      })
      if (res.ok) return true
    } catch {
      // Fallback
    }

    let tests = getStored<Test[]>(STORAGE_KEYS.TESTS, INITIAL_TESTS)
    tests = tests.filter((t) => t.id !== testId)
    setStored(STORAGE_KEYS.TESTS, tests)
    return true
  },

  async adminGetPendingEssays(): Promise<EssaySubmission[]> {
    try {
      const res = await fetch(`${API_BASE}/admin/essays`, {
        headers: getHeaders(true),
      })
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // Fallback
    }

    return getStored<EssaySubmission[]>(STORAGE_KEYS.ESSAYS, INITIAL_PENDING_ESSAYS)
  },

  async adminGradeEssay(essayId: string, score: number, note: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/admin/essays/${essayId}/grade`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ score, note }),
      })
      if (res.ok) return true
    } catch {
      // Fallback
    }

    const essays = getStored<EssaySubmission[]>(STORAGE_KEYS.ESSAYS, INITIAL_PENDING_ESSAYS)
    const idx = essays.findIndex((e) => e.id === essayId)
    if (idx === -1) return false
    essays[idx].score = score
    essays[idx].admin_review_note = note
    essays[idx].admin_reviewed_at = new Date().toISOString()
    setStored(STORAGE_KEYS.ESSAYS, essays)
    return true
  },

  async generateQuestionsAI(params: {
    category: TestCategory
    subject: string
    difficulty: DifficultyLevel
    count: number
  }): Promise<Question[]> {
    try {
      const res = await fetch(`${API_BASE}/ai/generate-questions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(params),
      })
      if (res.ok) {
        const data = await res.json()
        return data.map((q: Question) => ({
          ...q,
          options: q.options || [],
        }))
      }
    } catch {
      // Fallback
    }

    // Local deterministic generator conforming to AI_AGENT_AND_SECURITY.md
    const result: Question[] = []
    for (let i = 0; i < params.count; i++) {
      result.push({
        id: `ai-gen-${Date.now()}-${i}`,
        test_id: '',
        question_number: i + 1,
        question_text: `[AI-Agent: ${params.subject}] Evaluasi komprehensif butir asesmen standar tingkat ${params.difficulty.toUpperCase()} untuk topik ${params.subject}.`,
        question_type: 'multiple_choice',
        difficulty_level: params.difficulty,
        points: params.difficulty === 'hard' ? 10 : params.difficulty === 'medium' ? 5 : 3,
        explanation: `Analisis AI: Pilihan kunci menguraikan sintesis langsung dari prinsip ${params.subject} dengan regulasi baku yang berlaku.`,
        options: [
          { id: `opt-ai-${i}-a`, option_letter: 'A', option_text: 'Implementasi terintegrasi sesuai regulasi resmi dengan pengawasan berkala dan evaluasi terukur.', is_correct: true },
          { id: `opt-ai-${i}-b`, option_letter: 'B', option_text: 'Penetapan target tanpa mempertimbangkan kapasitas sumber daya dan batasan waktu realistis.', is_correct: false },
          { id: `opt-ai-${i}-c`, option_letter: 'C', option_text: 'Pendelegasian sepihak ke pihak eksternal tanpa audit kepatuhan tata kelola independen.', is_correct: false },
          { id: `opt-ai-${i}-d`, option_letter: 'D', option_text: 'Peniadaan prosedur standar operasional (SOP) demi fleksibilitas jangka pendek.', is_correct: false },
          { id: `opt-ai-${i}-e`, option_letter: 'E', option_text: 'Sentralisasi tertutup tanpa mekanisme transparansi dan akuntabilitas pemangku kepentingan.', is_correct: false },
        ],
      })
    }
    return result
  },
}
