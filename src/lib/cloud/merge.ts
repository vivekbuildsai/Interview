// Deterministic, lossless merge of a guest's local progress with an
// account's existing cloud progress. This is the policy referenced by
// Phase 5 of the account-system build: every derived aggregate (xp,
// topicStats, reviewQueue, streaks) is RECOMPUTED from the merged session
// history rather than combined by adding the two sides' numbers together.
// That's deliberate: both local and cloud already derive those numbers
// from (possibly overlapping) sessions, so summing them would double-count
// anything present on both sides. Recomputing from the deduplicated,
// id-unioned session set is the only way to merge without risking
// accidental loss (a real session missing from the result) or accidental
// duplication (a real session's XP/attempts counted twice).
//
// This file has no dependency on Supabase or any network/browser API --
// it's pure data in, data out, so it can be (and is, see merge.test.ts)
// unit tested exhaustively without mocking anything.

import type { AttemptRecord, SessionResult, StudyPlan, UserProgressState } from "@/lib/types"

export interface CloudProgressSnapshot {
  xp: number
  unlockedAchievements: string[]
  lastActiveDateKey: string | null
  streakDays: number
  bestStreak: number
  topicStats: Record<string, { correct: number; attempts: number }>
  reviewQueue: string[]
  theme: "dark" | "light"
  studyPlan: StudyPlan | null
  sessions: SessionResult[]
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function unionSessionsById(a: SessionResult[], b: SessionResult[]): SessionResult[] {
  const byId = new Map<string, SessionResult>()
  for (const s of a) byId.set(s.id, s)
  for (const s of b) if (!byId.has(s.id)) byId.set(s.id, s)
  return Array.from(byId.values()).sort((x, y) => x.finishedAt - y.finishedAt)
}

export function computeTopicStatsFromSessions(sessions: SessionResult[]): Record<string, { correct: number; attempts: number }> {
  const stats: Record<string, { correct: number; attempts: number }> = {}
  for (const session of sessions) {
    for (const attempt of session.attempts) {
      if (attempt.skipped) continue
      const entry = stats[attempt.topic] ?? { correct: 0, attempts: 0 }
      stats[attempt.topic] = { correct: entry.correct + (attempt.correct ? 1 : 0), attempts: entry.attempts + 1 }
    }
  }
  return stats
}

// A question belongs in the review queue if its most recent attempt
// (by submittedAt, across every merged session) was wrong and not
// skipped -- mirrors the live semantics in store.ts's finishSession,
// where a later correct answer removes a question from the queue.
export function computeReviewQueueFromSessions(sessions: SessionResult[]): string[] {
  const latestAttempt = new Map<string, AttemptRecord>()
  for (const session of sessions) {
    for (const attempt of session.attempts) {
      const existing = latestAttempt.get(attempt.questionId)
      if (!existing || attempt.submittedAt >= existing.submittedAt) {
        latestAttempt.set(attempt.questionId, attempt)
      }
    }
  }
  return Array.from(latestAttempt.values())
    .filter((a) => !a.correct && !a.skipped)
    .map((a) => a.questionId)
}

// Recomputes streakDays/bestStreak/lastActiveDateKey from the actual
// calendar days sessions were completed on, rather than adding the two
// sides' counters -- a streak is "how many consecutive days did this
// account actually play," which has one correct answer derivable from
// the real history, not a quantity where local+cloud makes sense.
export function computeStreaksFromSessions(sessions: SessionResult[]): { streakDays: number; bestStreak: number; lastActiveDateKey: string | null } {
  if (sessions.length === 0) return { streakDays: 0, bestStreak: 0, lastActiveDateKey: null }

  const days = Array.from(new Set(sessions.map((s) => dayKey(s.finishedAt)))).sort()

  let bestStreak = 1
  let currentRun = 1
  for (let i = 1; i < days.length; i++) {
    if (addDays(days[i - 1], 1) === days[i]) {
      currentRun += 1
    } else {
      currentRun = 1
    }
    bestStreak = Math.max(bestStreak, currentRun)
  }

  // The streak "as of" the merged history's most recent active day -- the
  // normal live updateStreak() in store.ts takes over from here the next
  // time the user actually plays, reconciling against real "today".
  const lastActiveDateKey = days[days.length - 1]
  let streakDays = 1
  for (let i = days.length - 1; i > 0; i--) {
    if (addDays(days[i - 1], 1) === days[i]) {
      streakDays += 1
    } else {
      break
    }
  }

  return { streakDays, bestStreak, lastActiveDateKey }
}

export function mergeProgress(local: UserProgressState, cloud: CloudProgressSnapshot): UserProgressState {
  const mergedSessions = unionSessionsById(local.sessions, cloud.sessions)
  const xp = mergedSessions.reduce((sum, s) => sum + s.xpEarned, 0)
  const unlockedAchievements = Array.from(new Set([...local.unlockedAchievements, ...cloud.unlockedAchievements]))
  const topicStats = computeTopicStatsFromSessions(mergedSessions)
  const reviewQueue = computeReviewQueueFromSessions(mergedSessions)
  const { streakDays, bestStreak: recomputedBestStreak, lastActiveDateKey } = computeStreaksFromSessions(mergedSessions)
  const bestStreak = Math.max(recomputedBestStreak, local.bestStreak, cloud.bestStreak)

  // Theme is a preference, not an earned value, so it's last-write-wins
  // rather than recomputed -- but "last write" defaults to local (the
  // device currently signing in reflects the user's most immediate
  // intent), unless local is a blank-slate guest with no history at all
  // and cloud already represents a real, established account.
  const theme = local.sessions.length === 0 && cloud.sessions.length > 0 ? cloud.theme : local.theme

  // Same reasoning as theme: a study plan is a personal choice, not an
  // earned/cumulative value, so it's last-write-wins rather than merged
  // field-by-field -- local wins unless local is a blank-slate guest
  // (no plan of its own) and the account already has one.
  const studyPlan = local.studyPlan ?? cloud.studyPlan

  return {
    xp,
    sessions: mergedSessions,
    unlockedAchievements,
    lastActiveDateKey,
    streakDays,
    bestStreak,
    topicStats,
    reviewQueue,
    theme,
    studyPlan,
  }
}
