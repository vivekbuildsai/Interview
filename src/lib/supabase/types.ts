// Hand-written row types for the two cloud tables (see
// supabase/migrations/0001_user_progress_and_sessions.sql). Mirrors the
// column names and types in that migration -- keep the two in sync.

export interface UserProgressRow {
  user_id: string
  xp: number
  unlocked_achievements: string[]
  last_active_date_key: string | null
  streak_days: number
  best_streak: number
  topic_stats: Record<string, { correct: number; attempts: number }>
  review_queue: string[]
  theme: "dark" | "light"
  study_plan: unknown | null
  client_updated_at: number
  updated_at: string
}

export interface SessionHistoryRow {
  id: string
  user_id: string
  game_id: string
  difficulty: string
  started_at: number
  finished_at: number
  xp_earned: number
  attempts: unknown
  created_at: string
}
