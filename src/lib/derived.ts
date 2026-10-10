import { levelFromXp } from "./scoring"
import { todayKey } from "./id"
import type { Difficulty, SessionResult, UserProgressState } from "./types"
import { getGame, getPlayableGames } from "./gameRegistry"
import { DIFFICULTIES } from "./types"

export interface WeakTopic {
  topic: string
  accuracy: number
  attempts: number
}

export function overallStats(progress: UserProgressState) {
  const levelInfo = levelFromXp(progress.xp)
  const allAttempts = progress.sessions.flatMap((s) => s.attempts)
  const graded = allAttempts.filter((a) => !a.skipped)
  const totalCorrect = graded.filter((a) => a.correct).length
  const accuracy = graded.length ? Math.round((totalCorrect / graded.length) * 100) : 0
  const gamesPlayed = new Set(progress.sessions.map((s) => s.gameId))

  const weakTopics: WeakTopic[] = Object.entries(progress.topicStats)
    .filter(([, v]) => v.attempts >= 2)
    .map(([topic, v]) => ({ topic, accuracy: Math.round((v.correct / v.attempts) * 100), attempts: v.attempts }))
    .filter((t) => t.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5)

  const recentSessions = [...progress.sessions].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 5)

  return { ...levelInfo, totalSessions: progress.sessions.length, totalCorrect, totalAttempts: graded.length, accuracy, gamesPlayed, weakTopics, recentSessions }
}

export function highestClearedDifficulty(sessions: SessionResult[], gameId: string): Difficulty | null {
  const order: Difficulty[] = ["beginner", "intermediate", "hard", "veryHard", "extreme"]
  const cleared = sessions.filter((s) => s.gameId === gameId).map((s) => s.difficulty)
  let best: Difficulty | null = null
  for (const d of order) {
    if (cleared.includes(d)) best = d
  }
  return best
}

export function gameProgressPct(sessions: SessionResult[], gameId: string): number {
  const game = getGame(gameId)
  if (!game || game.questions.length === 0) return 0
  const answeredIds = new Set(sessions.filter((s) => s.gameId === gameId).flatMap((s) => s.attempts.filter((a) => a.correct).map((a) => a.questionId)))
  return Math.round((answeredIds.size / game.questions.length) * 100)
}

export function recommendedNext(progress: UserProgressState) {
  if (progress.reviewQueue.length > 0) {
    return { type: "review" as const, count: progress.reviewQueue.length }
  }
  return { type: "new" as const }
}

function seededIndex(seed: string, length: number): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return length === 0 ? 0 : hash % length
}

export interface DailyChallenge {
  gameId: string
  gameName: string
  difficulty: Difficulty
  topic: string
}

// Deterministic per calendar day, not random per render -- the same
// challenge shows all day, and changes only when the date rolls over.
export function dailyChallenge(): DailyChallenge | null {
  const games = getPlayableGames().filter((g) => g.questions.length > 0)
  if (games.length === 0) return null
  const seed = todayKey()
  const game = games[seededIndex(seed + "game", games.length)]
  const difficulty = DIFFICULTIES[seededIndex(seed + "difficulty", DIFFICULTIES.length)]
  const topicCandidates = game.questions.filter((q) => q.difficulty === difficulty)
  const pool = topicCandidates.length > 0 ? topicCandidates : game.questions
  const topic = pool[seededIndex(seed + "topic", pool.length)].topic
  return { gameId: game.id, gameName: game.name, difficulty: topicCandidates.length > 0 ? difficulty : pool[0].difficulty, topic }
}
