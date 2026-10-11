// Study plan generation -- deterministic given the same progress and
// options (no randomness), so it's fully testable and reuses the same
// recommendation signals (weak topics, difficulty progression) as the
// dashboard's "next challenge" card instead of inventing a second
// selection system. A plan day only ever points at a game+difficulty
// (and optionally a topic) -- actually playing it goes through the
// existing /arena session flow unchanged; this never selects individual
// questions itself.

import { getGame, getPlayableGames } from "./gameRegistry"
import { weakestTopics } from "./recommendations"
import { DIFFICULTIES, type Difficulty, type SessionResult, type StudyPlan, type StudyPlanDay } from "./types"
import { newId, todayKey } from "./id"

export const STUDY_PLAN_HORIZONS = [7, 14, 30] as const
export type StudyPlanHorizon = (typeof STUDY_PLAN_HORIZONS)[number]

export interface GenerateStudyPlanOptions {
  horizonDays: number // UI only offers StudyPlanHorizon values, but the generator itself works for any positive count
  dailyMinutes: number
  domains?: string[] // gameIds; empty/omitted = draw from everything played plus weak areas
}

function dateKeyOffset(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// A revision day every 4th day if there's anything worth revisiting --
// frequent enough to matter, not so frequent it crowds out new material.
function isRevisionDay(dayIndex: number): boolean {
  return dayIndex > 0 && dayIndex % 4 === 3
}

export function generateStudyPlan(sessions: SessionResult[], reviewQueue: string[], options: GenerateStudyPlanOptions): StudyPlan {
  const pool = (options.domains && options.domains.length > 0 ? options.domains.map((id) => getGame(id)).filter((g): g is NonNullable<typeof g> => Boolean(g)) : getPlayableGames()).filter((g) => g.questions.length > 0)

  const weak = weakestTopics(sessions, 5)
  const playedGameIds = new Set(sessions.map((s) => s.gameId))
  const clearedDifficultyByGame = new Map<string, Difficulty>()
  for (const game of pool) {
    const cleared = sessions.filter((s) => s.gameId === game.id).map((s) => s.difficulty)
    let best: Difficulty | null = null
    for (const d of DIFFICULTIES) if (cleared.includes(d)) best = d
    if (best) clearedDifficultyByGame.set(game.id, best)
  }

  const days: StudyPlanDay[] = []
  for (let dayIndex = 0; dayIndex < options.horizonDays; dayIndex++) {
    const revision = isRevisionDay(dayIndex) && (reviewQueue.length > 0 || weak.length > 0)

    if (revision && weak.length > 0) {
      const topic = weak[dayIndex % weak.length]
      const game = getGame(topic.gameId)
      if (game) {
        days.push({
          dayIndex,
          dateKey: dateKeyOffset(dayIndex),
          gameId: game.id,
          gameName: game.name,
          difficulty: clearedDifficultyByGame.get(game.id) ?? "beginner",
          topic: topic.topic,
          estimatedMinutes: options.dailyMinutes,
          status: "pending",
          isRevision: true,
        })
        continue
      }
    }

    // New-material day: cycle through the pool so every selected domain
    // gets attention over the horizon rather than front-loading one.
    const game = pool.length > 0 ? pool[dayIndex % pool.length] : undefined
    if (!game) continue
    const cleared = clearedDifficultyByGame.get(game.id) ?? null
    const hasPlayed = playedGameIds.has(game.id)
    const difficulty: Difficulty = !hasPlayed ? "beginner" : cleared ? DIFFICULTIES[Math.min(DIFFICULTIES.indexOf(cleared) + 1, DIFFICULTIES.length - 1)] : "beginner"

    days.push({
      dayIndex,
      dateKey: dateKeyOffset(dayIndex),
      gameId: game.id,
      gameName: game.name,
      difficulty,
      topic: null,
      estimatedMinutes: options.dailyMinutes,
      status: "pending",
      isRevision: false,
    })
  }

  return {
    id: newId("plan"),
    createdAt: Date.now(),
    horizonDays: options.horizonDays,
    dailyMinutes: options.dailyMinutes,
    domains: options.domains ?? [],
    days,
  }
}

export function setDayStatus(plan: StudyPlan, dayIndex: number, status: StudyPlanDay["status"]): StudyPlan {
  return { ...plan, days: plan.days.map((d) => (d.dayIndex === dayIndex ? { ...d, status } : d)) }
}

// The next day that's actually due: today's day if still pending, or the
// earliest overdue pending day before it -- missing a day never removes
// it from the plan or silently marks it failed, it just waits.
export function nextDueDay(plan: StudyPlan): StudyPlanDay | null {
  const today = todayKey()
  const pending = plan.days.filter((d) => d.status === "pending" && d.dateKey <= today)
  if (pending.length > 0) return pending.sort((a, b) => a.dayIndex - b.dayIndex)[0]
  return plan.days.find((d) => d.status === "pending") ?? null
}

export function planProgress(plan: StudyPlan): { completed: number; skipped: number; total: number } {
  return {
    completed: plan.days.filter((d) => d.status === "completed").length,
    skipped: plan.days.filter((d) => d.status === "skipped").length,
    total: plan.days.length,
  }
}
