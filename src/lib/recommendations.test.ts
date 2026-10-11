import { describe, expect, it } from "vitest"
import { readinessEstimate, recommendNextChallenge, strongestTopics, topicPerformance, weakestTopics, weeklyPracticeProgress } from "./recommendations"
import { GAMES } from "./gameRegistry"
import type { AttemptRecord, SessionResult, UserProgressState } from "./types"

function attempt(overrides: Partial<AttemptRecord> & { questionId: string; topic: string }): AttemptRecord {
  return { difficulty: "beginner", correct: true, skipped: false, timeMs: 1000, hintsUsed: 0, submittedAt: 0, ...overrides }
}

function session(overrides: Partial<SessionResult> & { id: string; gameId: string }): SessionResult {
  return { difficulty: "beginner", startedAt: 0, finishedAt: 0, attempts: [], xpEarned: 0, ...overrides }
}

function progress(overrides: Partial<UserProgressState> = {}): UserProgressState {
  return { xp: 0, sessions: [], unlockedAchievements: [], lastActiveDateKey: null, streakDays: 0, bestStreak: 0, topicStats: {}, reviewQueue: [], theme: "dark", studyPlan: null, ...overrides }
}

describe("topicPerformance", () => {
  it("computes accuracy and last-practiced time per topic across sessions, ignoring skipped attempts", () => {
    const sessions = [
      session({
        id: "s1",
        gameId: "python",
        finishedAt: 100,
        attempts: [
          attempt({ questionId: "q1", topic: "Loops", correct: true, submittedAt: 10 }),
          attempt({ questionId: "q2", topic: "Loops", correct: false, submittedAt: 20 }),
          attempt({ questionId: "q3", topic: "Loops", skipped: true, correct: false, submittedAt: 30 }),
        ],
      }),
    ]
    const result = topicPerformance(sessions)
    expect(result).toEqual([{ topic: "Loops", gameId: "python", accuracy: 50, attempts: 2, lastPracticedAt: 20 }])
  })
})

describe("strongestTopics / weakestTopics", () => {
  const sessions = [
    session({
      id: "s1",
      gameId: "python",
      attempts: [
        attempt({ questionId: "q1", topic: "Strong", correct: true, submittedAt: 1 }),
        attempt({ questionId: "q2", topic: "Strong", correct: true, submittedAt: 2 }),
        attempt({ questionId: "q3", topic: "Weak", correct: false, submittedAt: 3 }),
        attempt({ questionId: "q4", topic: "Weak", correct: false, submittedAt: 4 }),
        attempt({ questionId: "q5", topic: "TooFewAttempts", correct: false, submittedAt: 5 }),
      ],
    }),
  ]

  it("ranks topics with enough attempts by accuracy, excluding topics below the minimum attempt count", () => {
    expect(strongestTopics(sessions, 5).map((t) => t.topic)).toEqual(["Strong", "Weak"])
    expect(weakestTopics(sessions, 5).map((t) => t.topic)).toEqual(["Weak", "Strong"])
  })
})

describe("readinessEstimate", () => {
  it("labels a brand new user as just getting started with a zero score", () => {
    const result = readinessEstimate(progress())
    expect(result.label).toBe("Just getting started")
    expect(result.score).toBe(0)
  })

  it("never claims to be a hiring prediction in its own basis text", () => {
    const result = readinessEstimate(progress({ sessions: [session({ id: "s1", gameId: "python", attempts: [attempt({ questionId: "q1", topic: "X", correct: true })] })] }))
    expect(result.basis.toLowerCase()).not.toContain("hire")
    expect(result.basis.toLowerCase()).not.toContain("hiring")
  })

  it("increases with more breadth, accuracy, and depth, and caps at 100", () => {
    const manySessions: SessionResult[] = []
    const difficulties = ["beginner", "intermediate", "hard", "veryHard", "extreme"] as const
    for (let i = 0; i < 20; i++) {
      manySessions.push(
        session({
          id: `s${i}`,
          gameId: i % 2 === 0 ? "python" : "kubernetes",
          difficulty: difficulties[i % difficulties.length],
          finishedAt: i,
          attempts: [attempt({ questionId: `q${i}`, topic: "T", correct: true, submittedAt: i })],
        }),
      )
    }
    const result = readinessEstimate(progress({ sessions: manySessions }))
    expect(result.score).toBeGreaterThan(50)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})

describe("recommendNextChallenge", () => {
  it("recommends a fresh start for a brand new guest with zero history", () => {
    const rec = recommendNextChallenge(progress())
    expect(rec).not.toBeNull()
    expect(rec!.kind).toBe("fresh-start")
    expect(rec!.difficulty).toBe("beginner")
  })

  it("prioritizes an overdue review question above everything else", () => {
    const python = progress({
      reviewQueue: ["py-beg-1"],
      sessions: [session({ id: "s1", gameId: "python", attempts: [attempt({ questionId: "py-beg-1", topic: "Variables", correct: false })] })],
    })
    const rec = recommendNextChallenge(python)
    expect(rec!.kind).toBe("review")
    expect(rec!.reason).toContain("queued for review")
  })

  it("recommends a weak topic (accuracy below 70%, with enough attempts) over trying a brand new domain", () => {
    const p = progress({
      sessions: [
        session({
          id: "s1",
          gameId: "python",
          difficulty: "beginner",
          attempts: [
            attempt({ questionId: "q1", topic: "Recursion", correct: false }),
            attempt({ questionId: "q2", topic: "Recursion", correct: false }),
            attempt({ questionId: "q3", topic: "Recursion", correct: true }),
          ],
        }),
      ],
    })
    const rec = recommendNextChallenge(p)
    expect(rec!.kind).toBe("weak-topic")
    expect(rec!.gameId).toBe("python")
    expect(rec!.reason).toContain("Recursion")
    expect(rec!.reason).toMatch(/\d+%/)
  })

  it("recommends an unplayed domain when there's no overdue review or weak topic", () => {
    const p = progress({
      sessions: [
        session({
          id: "s1",
          gameId: "python",
          attempts: [attempt({ questionId: "q1", topic: "Basics", correct: true }), attempt({ questionId: "q2", topic: "Basics", correct: true })],
        }),
      ],
    })
    const rec = recommendNextChallenge(p)
    expect(rec!.kind).toBe("new-domain")
    expect(rec!.gameId).not.toBe("python")
  })

  it("recommends progressing to the next difficulty once every domain has been tried and nothing is weak", () => {
    const sessions = GAMES.filter((g) => g.questions.length > 0).map((g, i) =>
      session({ id: `s${i}`, gameId: g.id, difficulty: "beginner", finishedAt: i, attempts: [attempt({ questionId: "q", topic: "T", correct: true })] }),
    )
    const rec = recommendNextChallenge(progress({ sessions }))
    expect(rec!.kind).toBe("progression")
    expect(rec!.difficulty).toBe("intermediate")
  })
})

describe("weeklyPracticeProgress", () => {
  it("counts only sessions finished within the last 7 days, and reports null days-since for no history", () => {
    expect(weeklyPracticeProgress([]).sessionsThisWeek).toBe(0)
    expect(weeklyPracticeProgress([]).daysSinceLastPractice).toBeNull()

    const now = Date.now()
    const sessions = [
      session({ id: "s1", gameId: "python", finishedAt: now - 1000 }),
      session({ id: "s2", gameId: "python", finishedAt: now - 10 * 86_400_000 }),
    ]
    const result = weeklyPracticeProgress(sessions)
    expect(result.sessionsThisWeek).toBe(1)
    expect(result.daysSinceLastPractice).toBe(0)
  })
})
