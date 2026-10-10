import type { AttemptRecord, Difficulty } from "./types"

// Base XP per correct answer, scaled by how hard the question actually
// was -- not a decorative label. Harder difficulties are worth more
// because they take more real skill, not because the UI says so.
const BASE_XP: Record<Difficulty, number> = {
  beginner: 10,
  intermediate: 18,
  hard: 28,
  veryHard: 42,
  extreme: 60,
}

const HINT_PENALTY_PCT = 0.15 // each hint used shaves 15% off that question's XP, floor 25%
const SPEED_BONUS_XP = 4 // small, capped bonus for answering well inside the estimate -- never dominant

export function xpForAttempt(attempt: Pick<AttemptRecord, "correct" | "difficulty" | "hintsUsed" | "timeMs">, estimatedSeconds?: number): number {
  if (!attempt.correct) return 0
  const base = BASE_XP[attempt.difficulty]
  const penalty = Math.min(attempt.hintsUsed * HINT_PENALTY_PCT, 0.75)
  let xp = Math.round(base * (1 - penalty))
  if (estimatedSeconds && attempt.timeMs < estimatedSeconds * 1000 * 0.6) {
    xp += SPEED_BONUS_XP
  }
  return Math.max(xp, 1)
}

export function xpForSession(attempts: AttemptRecord[], estimatedSecondsByQuestion: Record<string, number | undefined>): number {
  return attempts.reduce((sum, a) => sum + xpForAttempt(a, estimatedSecondsByQuestion[a.questionId]), 0)
}

// A smooth, slightly increasing XP curve: level N requires
// 100 * N * (N + 1) / 2 cumulative XP. Level 1 -> 100XP, level 5 -> 1500XP,
// level 10 -> 5500XP -- fast early progress, a genuine grind at the top.
export function levelFromXp(xp: number): { level: number; xpIntoLevel: number; xpForNextLevel: number; progressPct: number } {
  let level = 1
  while (cumulativeXpForLevel(level + 1) <= xp) level++
  const floor = cumulativeXpForLevel(level)
  const ceil = cumulativeXpForLevel(level + 1)
  const xpIntoLevel = xp - floor
  const xpForNextLevel = ceil - floor
  return { level, xpIntoLevel, xpForNextLevel, progressPct: Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)) }
}

function cumulativeXpForLevel(level: number): number {
  const n = level - 1
  return 100 * ((n * (n + 1)) / 2)
}

export function accuracyPct(attempts: AttemptRecord[]): number {
  const graded = attempts.filter((a) => !a.skipped)
  if (graded.length === 0) return 0
  return Math.round((graded.filter((a) => a.correct).length / graded.length) * 100)
}
