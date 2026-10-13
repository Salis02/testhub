import { create } from 'zustand'
import { Question, TestSession, UserSubmission } from '@/types'
import { sessionsApi } from '@/services/sessions.api'

interface TestSessionState {
  // State
  session: TestSession | null
  questions: Question[]
  currentIndex: number
  submissions: Record<string, UserSubmission>
  secondsLeft: number
  initialDuration: number
  autoSaveStatus: 'Tersinkronisasi' | 'Menyimpan...' | 'Tersimpan' | 'Gagal simpan'
  loading: boolean
  isSubmitting: boolean
  error: string | null

  // Actions
  initSession: (testId: string, searchSessionId?: string | null) => Promise<void>
  decrementTimer: () => boolean // returns true if timer reached 0
  setCurrentIndex: (index: number) => void
  selectOption: (optionId: string) => Promise<void>
  setEssayAnswer: (text: string) => Promise<void>
  toggleFlag: () => Promise<void>
  finishSession: () => Promise<string> // returns result ID
  resetSession: () => void
}

export const useTestSessionStore = create<TestSessionState>((set, get) => ({
  session: null,
  questions: [],
  currentIndex: 0,
  submissions: {},
  secondsLeft: 0,
  initialDuration: 0,
  autoSaveStatus: 'Tersinkronisasi',
  loading: true,
  isSubmitting: false,
  error: null,

  initSession: async (testId: string, searchSessionId?: string | null) => {
    try {
      set({ loading: true, error: null })
      let activeSessionId = searchSessionId

      if (!activeSessionId && testId) {
        const createdSession = await sessionsApi.startTest(testId)
        activeSessionId = createdSession.session_id
      }

      if (!activeSessionId) {
        throw new Error('Sesi ujian tidak valid.')
      }

      const { test, questions: qList } = await sessionsApi.getSessionQuestions(activeSessionId)
      if (qList.length === 0) {
        throw new Error('Modul ini belum memiliki butir soal aktif.')
      }

      const existingSubs = await sessionsApi.getSubmissions(activeSessionId)

      const sess: TestSession = {
        session_id: activeSessionId,
        test,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      }

      const totalSecs = test.duration_minutes * 60

      set({
        session: sess,
        questions: qList,
        submissions: existingSubs,
        initialDuration: totalSecs,
        secondsLeft: totalSecs,
        loading: false,
        error: null,
      })
    } catch (err) {
      set({ loading: false, error: (err as Error).message })
      throw err
    }
  },

  decrementTimer: () => {
    const { secondsLeft } = get()
    if (secondsLeft <= 1) {
      set({ secondsLeft: 0 })
      return true
    }
    set({ secondsLeft: secondsLeft - 1 })
    return false
  },

  setCurrentIndex: (index: number) => {
    const { questions } = get()
    if (index >= 0 && index < questions.length) {
      set({ currentIndex: index })
    }
  },

  selectOption: async (optionId: string) => {
    const { session, questions, currentIndex, submissions } = get()
    if (!session || questions.length === 0) return

    const currentQ = questions[currentIndex]
    const updated = {
      ...submissions,
      [currentQ.id]: {
        ...submissions[currentQ.id],
        question_id: currentQ.id,
        selected_option_id: optionId,
      },
    }

    set({ submissions: updated, autoSaveStatus: 'Menyimpan...' })

    try {
      await sessionsApi.submitAnswer(session.session_id, currentQ.id, { optionId })
      set({ autoSaveStatus: 'Tersimpan' })
    } catch {
      set({ autoSaveStatus: 'Gagal simpan' })
    }
  },

  setEssayAnswer: async (text: string) => {
    const { session, questions, currentIndex, submissions } = get()
    if (!session || questions.length === 0) return

    const currentQ = questions[currentIndex]
    const updated = {
      ...submissions,
      [currentQ.id]: {
        ...submissions[currentQ.id],
        question_id: currentQ.id,
        answer_text: text,
      },
    }

    set({ submissions: updated, autoSaveStatus: 'Menyimpan...' })

    try {
      await sessionsApi.submitAnswer(session.session_id, currentQ.id, { answerText: text })
      set({ autoSaveStatus: 'Tersimpan' })
    } catch {
      set({ autoSaveStatus: 'Gagal simpan' })
    }
  },

  toggleFlag: async () => {
    const { session, questions, currentIndex, submissions } = get()
    if (!session || questions.length === 0) return

    const currentQ = questions[currentIndex]
    const curFlag = !!submissions[currentQ.id]?.is_flagged
    const nextFlag = !curFlag

    const updated = {
      ...submissions,
      [currentQ.id]: {
        ...submissions[currentQ.id],
        question_id: currentQ.id,
        is_flagged: nextFlag,
      },
    }

    set({ submissions: updated, autoSaveStatus: 'Menyimpan...' })

    try {
      await sessionsApi.submitAnswer(session.session_id, currentQ.id, { isFlagged: nextFlag })
      set({ autoSaveStatus: 'Tersimpan' })
    } catch {
      set({ autoSaveStatus: 'Gagal simpan' })
    }
  },

  finishSession: async () => {
    const { session, initialDuration, secondsLeft } = get()
    if (!session) throw new Error('Tidak ada sesi ujian aktif.')

    try {
      set({ isSubmitting: true })
      const timeSpent = Math.max(1, initialDuration - secondsLeft)
      const res = await sessionsApi.finishTest(session.session_id, timeSpent)
      set({ isSubmitting: false })
      return res.id
    } catch (err) {
      set({ isSubmitting: false })
      throw err
    }
  },

  resetSession: () => {
    set({
      session: null,
      questions: [],
      currentIndex: 0,
      submissions: {},
      secondsLeft: 0,
      initialDuration: 0,
      autoSaveStatus: 'Tersinkronisasi',
      loading: true,
      isSubmitting: false,
      error: null,
    })
  },
}))
