// All direct Supabase reads/writes for cloud progress, isolated here so
// nothing else needs a mocked network client to be tested (see merge.ts
// and authStore for the pure/mockable logic that calls into this).
// Every function returns a typed Result instead of throwing, so callers
// never need a try/catch to keep local progress safe on failure (Phase 4
// requirement: handle network failures without corrupting local state).

import { supabase } from "@/lib/supabase/client"
import type { SessionHistoryRow, UserProgressRow } from "@/lib/supabase/types"
import type { CloudProgressSnapshot } from "./merge"
import type { SessionResult, UserProgressState } from "@/lib/types"

export type SyncResult<T> = { ok: true; data: T } | { ok: false; error: string }

function sessionFromRow(row: SessionHistoryRow): SessionResult {
  return {
    id: row.id,
    gameId: row.game_id,
    difficulty: row.difficulty as SessionResult["difficulty"],
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    xpEarned: row.xp_earned,
    attempts: Array.isArray(row.attempts) ? (row.attempts as SessionResult["attempts"]) : [],
  }
}

function rowFromSession(userId: string, session: SessionResult) {
  return {
    id: session.id,
    user_id: userId,
    game_id: session.gameId,
    difficulty: session.difficulty,
    started_at: session.startedAt,
    finished_at: session.finishedAt,
    xp_earned: session.xpEarned,
    attempts: session.attempts,
  }
}

export async function fetchCloudProgress(userId: string): Promise<SyncResult<CloudProgressSnapshot>> {
  if (!supabase) return { ok: false, error: "Cloud sync is not configured." }

  const [progressRes, sessionsRes] = await Promise.all([
    supabase.from("user_progress").select("*").eq("user_id", userId).maybeSingle<UserProgressRow>(),
    supabase.from("session_history").select("*").eq("user_id", userId).order("finished_at", { ascending: true }),
  ])

  if (progressRes.error) return { ok: false, error: progressRes.error.message }
  if (sessionsRes.error) return { ok: false, error: sessionsRes.error.message }

  const row = progressRes.data
  const sessions = ((sessionsRes.data ?? []) as SessionHistoryRow[]).map(sessionFromRow)

  return {
    ok: true,
    data: {
      xp: row?.xp ?? 0,
      unlockedAchievements: row?.unlocked_achievements ?? [],
      lastActiveDateKey: row?.last_active_date_key ?? null,
      streakDays: row?.streak_days ?? 0,
      bestStreak: row?.best_streak ?? 0,
      topicStats: row?.topic_stats ?? {},
      reviewQueue: row?.review_queue ?? [],
      theme: row?.theme ?? "dark",
      sessions,
    },
  }
}

// Pushes the aggregate document via the stale-write-guarding RPC (see
// the migration SQL), then separately upserts any sessions the cloud
// doesn't have yet. Session upserts use ignoreDuplicates so a retried
// push after a network failure never creates a duplicate row or errors
// on one that already made it through.
export async function pushCloudProgress(userId: string, progress: UserProgressState, clientUpdatedAt: number): Promise<SyncResult<{ appliedClientUpdatedAt: number }>> {
  if (!supabase) return { ok: false, error: "Cloud sync is not configured." }

  const sessionRows = progress.sessions.map((s) => rowFromSession(userId, s))
  if (sessionRows.length > 0) {
    const { error } = await supabase.from("session_history").upsert(sessionRows, { onConflict: "id", ignoreDuplicates: true })
    if (error) return { ok: false, error: error.message }
  }

  const { data, error } = await supabase.rpc("upsert_user_progress", {
    p_xp: progress.xp,
    p_unlocked_achievements: progress.unlockedAchievements,
    p_last_active_date_key: progress.lastActiveDateKey,
    p_streak_days: progress.streakDays,
    p_best_streak: progress.bestStreak,
    p_topic_stats: progress.topicStats,
    p_review_queue: progress.reviewQueue,
    p_theme: progress.theme,
    p_client_updated_at: clientUpdatedAt,
  })

  if (error) return { ok: false, error: error.message }
  const applied = (data as UserProgressRow | null)?.client_updated_at ?? clientUpdatedAt
  return { ok: true, data: { appliedClientUpdatedAt: applied } }
}
