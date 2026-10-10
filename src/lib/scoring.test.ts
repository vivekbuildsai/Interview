import { describe, expect, it } from "vitest"
import { accuracyPct, levelFromXp, xpForAttempt } from "./scoring"
import type { AttemptRecord } from "./types"

function attempt(overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    questionId: "q1",
    difficulty: "beginner",
    topic: "test",
    correct: true,
    skipped: false,
    timeMs: 10_000,
    hintsUsed: 0,
    submittedAt: Date.now(),
    ...overrides,
  }
}

describe("xpForAttempt", () => {
  it("awards 0 XP for an incorrect answer", () => {
    expect(xpForAttempt(attempt({ correct: false }))).toBe(0)
  })

  it("awards more XP for harder difficulties", () => {
    const beginnerXp = xpForAttempt(attempt({ difficulty: "beginner" }))
    const extremeXp = xpForAttempt(attempt({ difficulty: "extreme" }))
    expect(extremeXp).toBeGreaterThan(beginnerXp)
  })

  it("reduces XP as more hints are used, but never below 1", () => {
    const noHints = xpForAttempt(attempt({ difficulty: "beginner", hintsUsed: 0 }))
    const someHints = xpForAttempt(attempt({ difficulty: "beginner", hintsUsed: 2 }))
    const manyHints = xpForAttempt(attempt({ difficulty: "beginner", hintsUsed: 10 }))
    expect(someHints).toBeLessThan(noHints)
    expect(manyHints).toBeGreaterThanOrEqual(1)
  })

  it("adds a small speed bonus for answering well within the estimate", () => {
    const fast = xpForAttempt(attempt({ difficulty: "beginner", timeMs: 1000 }), 60)
    const slow = xpForAttempt(attempt({ difficulty: "beginner", timeMs: 55_000 }), 60)
    expect(fast).toBeGreaterThan(slow)
  })
})

describe("levelFromXp", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0).level).toBe(1)
  })

  it("advances to level 2 at exactly the cumulative threshold", () => {
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
  })

  it("never reports progress above 100%", () => {
    const { progressPct } = levelFromXp(50)
    expect(progressPct).toBeLessThanOrEqual(100)
    expect(progressPct).toBeGreaterThanOrEqual(0)
  })
})

describe("accuracyPct", () => {
  it("returns 0 for no graded attempts", () => {
    expect(accuracyPct([])).toBe(0)
    expect(accuracyPct([attempt({ skipped: true })])).toBe(0)
  })

  it("computes percent correct, excluding skipped questions", () => {
    const attempts = [attempt({ correct: true }), attempt({ correct: false }), attempt({ skipped: true, correct: false })]
    expect(accuracyPct(attempts)).toBe(50)
  })
})
