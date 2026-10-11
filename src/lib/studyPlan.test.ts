import { describe, expect, it } from "vitest"
import { generateStudyPlan, nextDueDay, planProgress, setDayStatus } from "./studyPlan"
import { todayKey } from "./id"
import type { AttemptRecord, SessionResult } from "./types"

function attempt(overrides: Partial<AttemptRecord> & { questionId: string; topic: string }): AttemptRecord {
  return { difficulty: "beginner", correct: true, skipped: false, timeMs: 1000, hintsUsed: 0, submittedAt: 0, ...overrides }
}

function session(overrides: Partial<SessionResult> & { id: string; gameId: string }): SessionResult {
  return { difficulty: "beginner", startedAt: 0, finishedAt: 0, attempts: [], xpEarned: 0, ...overrides }
}

describe("generateStudyPlan", () => {
  it("generates exactly horizonDays days, each pointing at a real, existing game", () => {
    const plan = generateStudyPlan([], [], { horizonDays: 7, dailyMinutes: 20 })
    expect(plan.days).toHaveLength(7)
    expect(plan.horizonDays).toBe(7)
    expect(plan.dailyMinutes).toBe(20)
    for (const day of plan.days) {
      expect(day.status).toBe("pending")
      expect(day.gameId.length).toBeGreaterThan(0)
      expect(day.gameName.length).toBeGreaterThan(0)
    }
  })

  it("is deterministic -- the same progress and options produce the same schedule of games/difficulties", () => {
    const sessions: SessionResult[] = [session({ id: "s1", gameId: "python", difficulty: "beginner", attempts: [attempt({ questionId: "q1", topic: "Loops", correct: true })] })]
    const a = generateStudyPlan(sessions, [], { horizonDays: 14, dailyMinutes: 30 })
    const b = generateStudyPlan(sessions, [], { horizonDays: 14, dailyMinutes: 30 })
    expect(a.days.map((d) => ({ gameId: d.gameId, difficulty: d.difficulty, isRevision: d.isRevision }))).toEqual(
      b.days.map((d) => ({ gameId: d.gameId, difficulty: d.difficulty, isRevision: d.isRevision })),
    )
  })

  it("restricts the schedule to the selected domains when given", () => {
    const plan = generateStudyPlan([], [], { horizonDays: 7, dailyMinutes: 15, domains: ["python", "kubernetes"] })
    for (const day of plan.days) {
      expect(["python", "kubernetes"]).toContain(day.gameId)
    }
  })

  it("schedules revision days for weak topics, not just new material", () => {
    const sessions: SessionResult[] = [
      session({
        id: "s1",
        gameId: "python",
        attempts: [
          attempt({ questionId: "q1", topic: "Recursion", correct: false }),
          attempt({ questionId: "q2", topic: "Recursion", correct: false }),
        ],
      }),
    ]
    const plan = generateStudyPlan(sessions, ["py-beg-1"], { horizonDays: 8, dailyMinutes: 20 })
    expect(plan.days.some((d) => d.isRevision)).toBe(true)
  })
})

describe("setDayStatus / planProgress", () => {
  it("updates only the targeted day and leaves the rest pending", () => {
    const plan = generateStudyPlan([], [], { horizonDays: 3, dailyMinutes: 10 })
    const updated = setDayStatus(plan, 1, "completed")
    expect(updated.days[0].status).toBe("pending")
    expect(updated.days[1].status).toBe("completed")
    expect(updated.days[2].status).toBe("pending")
  })

  it("counts completed and skipped days correctly", () => {
    let plan = generateStudyPlan([], [], { horizonDays: 5, dailyMinutes: 10 })
    plan = setDayStatus(plan, 0, "completed")
    plan = setDayStatus(plan, 1, "skipped")
    expect(planProgress(plan)).toEqual({ completed: 1, skipped: 1, total: 5 })
  })
})

describe("nextDueDay", () => {
  it("returns the first pending day that's due today or earlier, never an already-completed one", () => {
    let plan = generateStudyPlan([], [], { horizonDays: 5, dailyMinutes: 10 })
    plan = { ...plan, days: plan.days.map((d, i) => ({ ...d, dateKey: i === 0 ? todayKey() : d.dateKey })) }
    plan = setDayStatus(plan, 0, "completed")
    const due = nextDueDay(plan)
    expect(due).not.toBeNull()
    expect(due!.status).toBe("pending")
  })

  it("returns null once every day is completed or skipped -- missing a day never leaves it stuck as permanently failed", () => {
    let plan = generateStudyPlan([], [], { horizonDays: 2, dailyMinutes: 10 })
    plan = setDayStatus(plan, 0, "completed")
    plan = setDayStatus(plan, 1, "skipped")
    expect(nextDueDay(plan)).toBeNull()
  })
})
