import { describe, expect, it } from "vitest"
import { computeReviewQueueFromSessions, computeStreaksFromSessions, computeTopicStatsFromSessions, mergeProgress, unionSessionsById } from "./merge"
import type { AttemptRecord, SessionResult, UserProgressState } from "@/lib/types"

function attempt(overrides: Partial<AttemptRecord> & { questionId: string; topic: string }): AttemptRecord {
  return {
    difficulty: "beginner",
    correct: true,
    skipped: false,
    timeMs: 1000,
    hintsUsed: 0,
    submittedAt: 0,
    ...overrides,
  }
}

function session(overrides: Partial<SessionResult> & { id: string }): SessionResult {
  return {
    gameId: "python",
    difficulty: "beginner",
    startedAt: 0,
    finishedAt: 0,
    attempts: [],
    xpEarned: 0,
    ...overrides,
  }
}

function emptyProgress(overrides: Partial<UserProgressState> = {}): UserProgressState {
  return {
    xp: 0,
    sessions: [],
    unlockedAchievements: [],
    lastActiveDateKey: null,
    streakDays: 0,
    bestStreak: 0,
    topicStats: {},
    reviewQueue: [],
    theme: "dark",
    ...overrides,
  }
}

describe("unionSessionsById", () => {
  it("de-duplicates sessions present on both sides by id", () => {
    const shared = session({ id: "s1", finishedAt: 100 })
    const result = unionSessionsById([shared], [shared])
    expect(result).toHaveLength(1)
  })

  it("keeps sessions unique to each side and sorts by finishedAt", () => {
    const a = session({ id: "a", finishedAt: 200 })
    const b = session({ id: "b", finishedAt: 100 })
    const result = unionSessionsById([a], [b])
    expect(result.map((s) => s.id)).toEqual(["b", "a"])
  })
})

describe("computeTopicStatsFromSessions", () => {
  it("counts correct/attempts per topic, excluding skipped attempts", () => {
    const sessions = [
      session({
        id: "s1",
        attempts: [attempt({ questionId: "q1", topic: "loops", correct: true }), attempt({ questionId: "q2", topic: "loops", correct: false }), attempt({ questionId: "q3", topic: "loops", skipped: true, correct: false })],
      }),
    ]
    expect(computeTopicStatsFromSessions(sessions)).toEqual({ loops: { correct: 1, attempts: 2 } })
  })
})

describe("computeReviewQueueFromSessions", () => {
  it("includes a question whose latest attempt was wrong", () => {
    const sessions = [session({ id: "s1", attempts: [attempt({ questionId: "q1", topic: "loops", correct: false, submittedAt: 10 })] })]
    expect(computeReviewQueueFromSessions(sessions)).toEqual(["q1"])
  })

  it("excludes a question that was later answered correctly, even in an earlier-merged session", () => {
    const sessions = [
      session({ id: "s1", attempts: [attempt({ questionId: "q1", topic: "loops", correct: false, submittedAt: 10 })] }),
      session({ id: "s2", attempts: [attempt({ questionId: "q1", topic: "loops", correct: true, submittedAt: 20 })] }),
    ]
    expect(computeReviewQueueFromSessions(sessions)).toEqual([])
  })
})

describe("computeStreaksFromSessions", () => {
  it("returns zeroes for no sessions", () => {
    expect(computeStreaksFromSessions([])).toEqual({ streakDays: 0, bestStreak: 0, lastActiveDateKey: null })
  })

  it("counts a run of consecutive days correctly", () => {
    const sessions = [
      session({ id: "s1", finishedAt: Date.parse("2026-01-01T12:00:00Z") }),
      session({ id: "s2", finishedAt: Date.parse("2026-01-02T12:00:00Z") }),
      session({ id: "s3", finishedAt: Date.parse("2026-01-03T12:00:00Z") }),
    ]
    expect(computeStreaksFromSessions(sessions)).toEqual({ streakDays: 3, bestStreak: 3, lastActiveDateKey: "2026-01-03" })
  })

  it("resets the current run after a gap but remembers the best run", () => {
    const sessions = [
      session({ id: "s1", finishedAt: Date.parse("2026-01-01T12:00:00Z") }),
      session({ id: "s2", finishedAt: Date.parse("2026-01-02T12:00:00Z") }),
      session({ id: "s3", finishedAt: Date.parse("2026-01-10T12:00:00Z") }),
    ]
    expect(computeStreaksFromSessions(sessions)).toEqual({ streakDays: 1, bestStreak: 2, lastActiveDateKey: "2026-01-10" })
  })
})

describe("mergeProgress", () => {
  it("adopts local as-is when the cloud account is brand new (no prior progress)", () => {
    const local = emptyProgress({
      xp: 28,
      sessions: [session({ id: "s1", finishedAt: 100, xpEarned: 28, attempts: [attempt({ questionId: "q1", topic: "loops", correct: true })] })],
      unlockedAchievements: ["first_session"],
    })
    const cloud = { ...emptyProgress(), sessions: [] }
    const result = mergeProgress(local, cloud)
    expect(result.xp).toBe(28)
    expect(result.sessions).toHaveLength(1)
    expect(result.unlockedAchievements).toEqual(["first_session"])
  })

  it("never double-counts XP for a session present on both sides (idempotent re-merge)", () => {
    const shared = session({ id: "shared", finishedAt: 100, xpEarned: 28, attempts: [attempt({ questionId: "q1", topic: "loops", correct: true })] })
    const local = emptyProgress({ xp: 28, sessions: [shared] })
    const cloud: import("./merge").CloudProgressSnapshot = { ...emptyProgress(), xp: 28, sessions: [shared] }
    const result = mergeProgress(local, cloud)
    expect(result.xp).toBe(28)
    expect(result.sessions).toHaveLength(1)
  })

  it("unions distinct sessions from both sides and recomputes xp as their sum", () => {
    const localSession = session({ id: "local1", finishedAt: 100, xpEarned: 10, attempts: [attempt({ questionId: "q1", topic: "loops", correct: true })] })
    const cloudSession = session({ id: "cloud1", finishedAt: 200, xpEarned: 15, attempts: [attempt({ questionId: "q2", topic: "strings", correct: true })] })
    const local = emptyProgress({ xp: 10, sessions: [localSession], unlockedAchievements: ["a"] })
    const cloud: import("./merge").CloudProgressSnapshot = { ...emptyProgress(), xp: 15, sessions: [cloudSession], unlockedAchievements: ["b"] }

    const result = mergeProgress(local, cloud)

    expect(result.xp).toBe(25)
    expect(result.sessions.map((s) => s.id)).toEqual(["local1", "cloud1"])
    expect(result.unlockedAchievements.sort()).toEqual(["a", "b"])
    expect(result.topicStats).toEqual({ loops: { correct: 1, attempts: 1 }, strings: { correct: 1, attempts: 1 } })
  })

  it("keeps the higher bestStreak even if the merged session history alone implies a lower one", () => {
    const local = emptyProgress({ sessions: [session({ id: "s1", finishedAt: Date.parse("2026-02-01T00:00:00Z") })], bestStreak: 12 })
    const cloud: import("./merge").CloudProgressSnapshot = { ...emptyProgress(), sessions: [], bestStreak: 3 }
    const result = mergeProgress(local, cloud)
    expect(result.bestStreak).toBe(12)
  })

  it("prefers the cloud theme when local is a blank-slate guest and cloud has real history", () => {
    const local = emptyProgress({ theme: "dark", sessions: [] })
    const cloud: import("./merge").CloudProgressSnapshot = { ...emptyProgress(), theme: "light", sessions: [session({ id: "s1", finishedAt: 100 })] }
    expect(mergeProgress(local, cloud).theme).toBe("light")
  })

  it("prefers the local theme whenever local has any session history of its own", () => {
    const local = emptyProgress({ theme: "light", sessions: [session({ id: "s1", finishedAt: 100 })] })
    const cloud: import("./merge").CloudProgressSnapshot = { ...emptyProgress(), theme: "dark", sessions: [session({ id: "s2", finishedAt: 200 })] }
    expect(mergeProgress(local, cloud).theme).toBe("light")
  })
})
