// A deterministic, offline-first recommendation engine -- no network
// call, no AI provider, no randomness. Every function here is a pure
// computation over the UserProgressState the app already persists
// (sessions, topicStats, reviewQueue), so recommendations work exactly
// the same for a guest with zero network access as for a signed-in user,
// and are fully unit-testable without mocking anything. An AI-backed
// coach (src/lib/aiCoach.ts) can layer richer explanations on top of
// this later, but this engine is the required, always-available baseline
// -- it must keep working if that AI service is ever unreachable.

import { getGame, getPlayableGames, questionsForDifficulty } from "./gameRegistry"
import { DIFFICULTIES } from "./types"
import type { Difficulty, SessionResult, UserProgressState } from "./types"

const MS_PER_DAY = 86_400_000

export interface TopicPerformance {
  topic: string
  gameId: string
  accuracy: number
  attempts: number
  lastPracticedAt: number
}

// topicStats (on UserProgressState) only tracks correct/attempts, not
// which game a topic belongs to or when it was last touched -- both of
// which the recommendation engine needs, so this derives a richer view
// directly from session history instead of extending that core type.
export function topicPerformance(sessions: SessionResult[]): TopicPerformance[] {
  const byTopic = new Map<string, { gameId: string; correct: number; attempts: number; lastPracticedAt: number }>()
  for (const session of sessions) {
    for (const attempt of session.attempts) {
      if (attempt.skipped) continue
      const existing = byTopic.get(attempt.topic) ?? { gameId: session.gameId, correct: 0, attempts: 0, lastPracticedAt: 0 }
      existing.correct += attempt.correct ? 1 : 0
      existing.attempts += 1
      existing.lastPracticedAt = Math.max(existing.lastPracticedAt, attempt.submittedAt)
      existing.gameId = session.gameId
      byTopic.set(attempt.topic, existing)
    }
  }
  return Array.from(byTopic.entries()).map(([topic, v]) => ({
    topic,
    gameId: v.gameId,
    accuracy: v.attempts > 0 ? Math.round((v.correct / v.attempts) * 100) : 0,
    attempts: v.attempts,
    lastPracticedAt: v.lastPracticedAt,
  }))
}

const MIN_ATTEMPTS_FOR_RANKING = 2

export function strongestTopics(sessions: SessionResult[], limit = 3): TopicPerformance[] {
  return topicPerformance(sessions)
    .filter((t) => t.attempts >= MIN_ATTEMPTS_FOR_RANKING)
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts)
    .slice(0, limit)
}

export function weakestTopics(sessions: SessionResult[], limit = 3): TopicPerformance[] {
  return topicPerformance(sessions)
    .filter((t) => t.attempts >= MIN_ATTEMPTS_FOR_RANKING)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, limit)
}

export interface ReadinessEstimate {
  score: number // 0-100
  label: "Just getting started" | "Building fundamentals" | "Making solid progress" | "Interview ready" | "Strongly prepared"
  basis: string
}

// Deliberately simple and fully explainable (not a black box, and never
// described as a hiring prediction): breadth (how many domains you've
// actually touched), accuracy (how well you do when you try), and depth
// (how far up the difficulty ladder you've gone), each capped so no
// single dimension can carry the score alone -- you can't reach
// "strongly prepared" from accuracy on one easy topic.
export function readinessEstimate(progress: UserProgressState): ReadinessEstimate {
  const totalGames = getPlayableGames().length
  const gamesPlayed = new Set(progress.sessions.map((s) => s.gameId)).size
  const breadthPct = totalGames > 0 ? Math.min(1, gamesPlayed / Math.min(6, totalGames)) : 0

  const allAttempts = progress.sessions.flatMap((s) => s.attempts).filter((a) => !a.skipped)
  const accuracyPct = allAttempts.length > 0 ? allAttempts.filter((a) => a.correct).length / allAttempts.length : 0

  const difficultiesCleared = new Set(progress.sessions.map((s) => s.difficulty)).size
  const depthPct = difficultiesCleared / DIFFICULTIES.length

  const volumeFactor = Math.min(1, progress.sessions.length / 15) // confidence multiplier -- a couple of sessions shouldn't swing the score to the extremes

  const score = Math.round((breadthPct * 30 + accuracyPct * 40 + depthPct * 30) * (0.4 + 0.6 * volumeFactor))

  let label: ReadinessEstimate["label"]
  if (progress.sessions.length === 0) label = "Just getting started"
  else if (score < 25) label = "Building fundamentals"
  else if (score < 50) label = "Making solid progress"
  else if (score < 75) label = "Interview ready"
  else label = "Strongly prepared"

  return {
    score,
    label,
    basis: `Based on ${gamesPlayed} domain${gamesPlayed === 1 ? "" : "s"} practiced, ${Math.round(accuracyPct * 100)}% overall accuracy, and ${difficultiesCleared}/${DIFFICULTIES.length} difficulty levels attempted.`,
  }
}

export interface NextChallengeRecommendation {
  gameId: string
  gameName: string
  difficulty: Difficulty
  topic: string | null
  reason: string
  kind: "review" | "weak-topic" | "new-domain" | "progression" | "fresh-start"
}

function highestClearedDifficultyFor(sessions: SessionResult[], gameId: string): Difficulty | null {
  const cleared = sessions.filter((s) => s.gameId === gameId).map((s) => s.difficulty)
  let best: Difficulty | null = null
  for (const d of DIFFICULTIES) if (cleared.includes(d)) best = d
  return best
}

function nextDifficultyAfter(d: Difficulty | null): Difficulty {
  if (!d) return "beginner"
  const idx = DIFFICULTIES.indexOf(d)
  return DIFFICULTIES[Math.min(idx + 1, DIFFICULTIES.length - 1)]
}

// The single most useful thing to practice right now, with a plain-
// language reason -- prioritizing overdue revision and weak topics
// (per the product requirement), falling back to breadth, then
// progression, so there's always a concrete, non-random answer.
export function recommendNextChallenge(progress: UserProgressState): NextChallengeRecommendation | null {
  if (progress.reviewQueue.length > 0) {
    const game = getPlayableGames().find((g) => g.questions.some((q) => progress.reviewQueue.includes(q.id)))
    if (game) {
      const question = game.questions.find((q) => progress.reviewQueue.includes(q.id))!
      return {
        gameId: game.id,
        gameName: game.name,
        difficulty: question.difficulty,
        topic: question.topic,
        reason: `You have ${progress.reviewQueue.length} question${progress.reviewQueue.length === 1 ? "" : "s"} queued for review, including one on ${question.topic}.`,
        kind: "review",
      }
    }
  }

  const weak = weakestTopics(progress.sessions, 1)[0]
  if (weak && weak.accuracy < 70) {
    const game = getGame(weak.gameId)
    if (game) {
      const difficultyToPractice = highestClearedDifficultyFor(progress.sessions, weak.gameId) ?? "beginner"
      return {
        gameId: game.id,
        gameName: game.name,
        difficulty: difficultyToPractice,
        topic: weak.topic,
        reason: `Recommended because your recent ${game.name} ${weak.topic} accuracy is ${weak.accuracy}%.`,
        kind: "weak-topic",
      }
    }
  }

  if (progress.sessions.length === 0) {
    const first = getPlayableGames().find((g) => g.questions.length > 0)
    if (first) {
      return { gameId: first.id, gameName: first.name, difficulty: "beginner", topic: null, reason: `A great place to start.`, kind: "fresh-start" }
    }
    return null
  }

  const playedGameIds = new Set(progress.sessions.map((s) => s.gameId))
  const unplayed = getPlayableGames().find((g) => !playedGameIds.has(g.id) && g.questions.length > 0)
  if (unplayed) {
    return {
      gameId: unplayed.id,
      gameName: unplayed.name,
      difficulty: "beginner",
      topic: null,
      reason: `You haven't tried ${unplayed.name} yet -- broadening your practice across domains improves overall readiness.`,
      kind: "new-domain",
    }
  }

  const mostRecentGameId = [...progress.sessions].sort((a, b) => b.finishedAt - a.finishedAt)[0].gameId
  const game = getGame(mostRecentGameId)
  if (!game) return null
  const cleared = highestClearedDifficultyFor(progress.sessions, game.id)
  const next = nextDifficultyAfter(cleared)
  if (questionsForDifficulty(game.id, next).length === 0) {
    return { gameId: game.id, gameName: game.name, difficulty: cleared ?? "beginner", topic: null, reason: `Keep sharpening ${game.name} -- you're doing well here.`, kind: "progression" }
  }
  return {
    gameId: game.id,
    gameName: game.name,
    difficulty: next,
    topic: null,
    reason: cleared ? `You've cleared ${cleared} in ${game.name} -- ready to try ${next}?` : `Continue building your ${game.name} fundamentals.`,
    kind: "progression",
  }
}

export interface WeeklyPracticeProgress {
  sessionsThisWeek: number
  weeklyGoal: number
  daysSinceLastPractice: number | null
}

const DEFAULT_WEEKLY_GOAL = 5

// Derived entirely from session timestamps already stored -- no new
// persisted "weekly goal progress" field, so there's nothing new to
// lose, migrate, or get out of sync with the real session history.
export function weeklyPracticeProgress(sessions: SessionResult[], weeklyGoal = DEFAULT_WEEKLY_GOAL): WeeklyPracticeProgress {
  const now = Date.now()
  const weekAgo = now - 7 * MS_PER_DAY
  const sessionsThisWeek = sessions.filter((s) => s.finishedAt >= weekAgo).length
  const lastFinishedAt = sessions.length > 0 ? Math.max(...sessions.map((s) => s.finishedAt)) : null
  const daysSinceLastPractice = lastFinishedAt === null ? null : Math.floor((now - lastFinishedAt) / MS_PER_DAY)
  return { sessionsThisWeek, weeklyGoal, daysSinceLastPractice }
}
