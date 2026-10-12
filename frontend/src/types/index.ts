export type TestCategory = 'cpns' | 'sbmptn' | 'iq' | 'custom'

export type QuestionType = 'multiple_choice' | 'essay' | 'matching'

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface QuestionOption {
  id: string
  question_id?: string
  option_letter: 'A' | 'B' | 'C' | 'D' | 'E'
  option_text: string
  is_correct?: boolean
}

export interface Question {
  id: string
  test_id: string
  question_number: number
  question_text: string
  question_type: QuestionType
  media_url?: string | null
  difficulty_level: DifficultyLevel
  explanation: string
  points: number
  options: QuestionOption[]
}

export interface Test {
  id: string
  creator_id?: string
  title: string
  description: string
  category: TestCategory
  duration_minutes: number
  passing_score_percentage: number
  total_questions: number
  shuffle_questions?: boolean
  shuffle_answers?: boolean
  published: boolean
  created_at: string
  updated_at: string
}

export interface TestSession {
  session_id: string
  test: {
    id: string
    title: string
    category: TestCategory
    duration_minutes: number
    total_questions: number
    passing_score_percentage: number
  }
  expires_at: string
  started_at: string
}

export interface UserSubmission {
  question_id: string
  selected_option_id?: string
  answer_text?: string
  is_flagged?: boolean
  answered_at?: string
}

export interface CategoryScore {
  category_name: string
  score: number
  total_possible: number
  percentage: number
}

export interface TestResult {
  id: string
  session_id: string
  test_id: string
  test_title: string
  category: TestCategory
  total_score: number
  percentage_score: number
  passing: boolean
  passing_score_percentage: number
  time_spent_seconds: number
  duration_seconds: number
  questions_answered: number
  questions_correct: number
  total_questions: number
  percentile: number
  category_breakdown: CategoryScore[]
  submitted_at: string
  submissions: Record<string, UserSubmission>
}

export interface EssaySubmission {
  id: string
  test_id: string
  test_title: string
  session_id: string
  question_id: string
  question_text: string
  user_answer_text: string
  score?: number
  admin_review_note?: string
  admin_reviewed_at?: string
  submitted_at: string
}

export interface AdminStats {
  total_tests: number
  published_tests: number
  total_sessions: number
  total_completions: number
  completion_rate_percentage: number
  average_score_percentage: number
  pending_essays: number
}

export interface User {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'creator' | 'user'
  subscription_tier?: string
  is_active?: boolean
}
