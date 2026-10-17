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
  price_idr?: number
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

export interface UserListItem {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'creator' | 'user'
  subscription_tier: string
  subscription_expires_at?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserListResponse {
  users: UserListItem[]
  total: number
  limit: number
  offset: number
}

export interface UpdateUserRoleDTO {
  role: 'admin' | 'creator' | 'user'
}

export interface UpdateUserStatusDTO {
  is_active: boolean
}

export interface AuthResponse {
  user_id: string
  email: string
  full_name: string
  role: 'admin' | 'creator' | 'user'
  token: string
  refresh_token?: string
  user?: User
}


export type SubscriptionStatus = 'active' | 'suspended' | 'revoked'
export type SubscriptionTier = 'per_test' | 'season_pass' | 'monthly_subscription' | 'lifetime' | 'institution'
export type SubscriptionSource = 'payment_gateway' | 'admin_manual'

export interface Subscription {
  id: string
  user_identifier: string
  test_id?: string | null
  test_title?: string | null
  category?: string | null
  tier: SubscriptionTier
  status: SubscriptionStatus
  source: SubscriptionSource
  amount_paid: number
  admin_notes?: string | null
  valid_until?: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionsListResponse {
  subscriptions: Subscription[]
  total: number
  limit: number
  offset: number
}

export interface ManualGrantDTO {
  user_identifier: string
  test_id?: string | null
  plan_type: SubscriptionTier
  valid_days: number
  reason_notes: string
}

export interface UpdateSubscriptionStatusDTO {
  status: SubscriptionStatus
  extend_days?: number
  admin_notes?: string
}

export interface PaymentInvoiceResponse {
  order_id: string
  plan_type: SubscriptionTier
  title: string
  amount: number
  status: 'pending' | 'settled' | 'expired'
  payment_method: string
  qr_payload: string
  snap_token: string
  redirect_url: string
  provider: string
  expires_at: string
  countdown_second: number
}

export interface OrderStatusResponse {
  order_id: string
  status: 'pending' | 'settled' | 'expired'
  plan_type: SubscriptionTier
  amount: number
  user_email: string
  settled_at?: string | null
}

export interface LeaderboardEntry {
  rank: number
  session_id: string
  user_identifier: string
  score: number
  percentage_score: number
  time_spent_seconds: number
  submitted_at: string
}

export interface LeaderboardResponse {
  test_id: string
  leaderboard: LeaderboardEntry[]
  total: number
}

export interface CertificateData {
  certificate_id: string
  result_id: string
  test_id?: string
  test_title: string
  category: string
  percentage_score: number
  passing: boolean
  passing_score_percentage: number
  issued_at: string
  verification_url?: string
  issuer: string
  status?: string
  valid?: boolean
}

export interface TestAnalytics {
  test_id: string
  test_title: string
  total_submissions: number
  average_score: number
  passing_rate: number
}

export interface AdminAuditLog {
  id: string
  admin_id?: string
  admin_email?: string
  action: string
  resource_type: string
  resource_id?: string
  old_value?: string
  new_value?: string
  ip_address?: string
  created_at: string
}


