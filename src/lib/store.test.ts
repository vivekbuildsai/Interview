import { beforeEach, describe, expect, it } from "vitest"
import { useArenaStore } from "./store"
import { pythonGame } from "@/games/python"

function freshQuestions(count = 3) {
  return pythonGame.questions.filter((q) => q.difficulty === "beginner").slice(0, count)
}

beforeEach(() => {
  window.localStorage.clear()
  useArenaStore.getState().resetProgress()
})

describe("useArenaStore", () => {
  it("starts a session with the given questions in order", () => {
    const questions = freshQuestions()
    useArenaStore.getState().startSession("python", "beginner", questions)
    const session = useArenaStore.getState().activeSession
    expect(session).not.toBeNull()
    expect(session!.questionIds).toEqual(questions.map((q) => q.id))
    expect(session!.currentIndex).toBe(0)
  })

  it("records attempts and finishing a session moves it into history with real XP", () => {
    const questions = freshQuestions(2)
    useArenaStore.getState().startSession("python", "beginner", questions)
    useArenaStore.getState().recordAttempt({ questionId: questions[0].id, difficulty: "beginner", topic: questions[0].topic, correct: true, skipped: false, hintsUsed: 0, timeMs: 5000 })
    useArenaStore.getState().recordAttempt({ questionId: questions[1].id, difficulty: "beginner", topic: questions[1].topic, correct: false, skipped: false, hintsUsed: 0, timeMs: 5000 })

    const estimates = Object.fromEntries(questions.map((q) => [q.id, q.estimatedSeconds]))
    const result = useArenaStore.getState().finishSession(estimates)

    expect(result).not.toBeNull()
    expect(result!.attempts).toHaveLength(2)
    expect(result!.xpEarned).toBeGreaterThan(0)

    const progress = useArenaStore.getState().progress
    expect(progress.sessions).toHaveLength(1)
    expect(progress.xp).toBe(result!.xpEarned)
    expect(useArenaStore.getState().activeSession).toBeNull()
  })

  it("adds incorrect answers to the review queue, and removes them once answered correctly", () => {
    const questions = freshQuestions(1)
    useArenaStore.getState().startSession("python", "beginner", questions)
    useArenaStore.getState().recordAttempt({ questionId: questions[0].id, difficulty: "beginner", topic: questions[0].topic, correct: false, skipped: false, hintsUsed: 0, timeMs: 1000 })
    useArenaStore.getState().finishSession({})

    expect(useArenaStore.getState().progress.reviewQueue).toContain(questions[0].id)

    useArenaStore.getState().startSession("python", "beginner", questions)
    useArenaStore.getState().recordAttempt({ questionId: questions[0].id, difficulty: "beginner", topic: questions[0].topic, correct: true, skipped: false, hintsUsed: 0, timeMs: 1000 })
    useArenaStore.getState().finishSession({})

    expect(useArenaStore.getState().progress.reviewQueue).not.toContain(questions[0].id)
  })

  it("unlocks the first-session achievement exactly once", () => {
    const questions = freshQuestions(1)
    useArenaStore.getState().startSession("python", "beginner", questions)
    useArenaStore.getState().recordAttempt({ questionId: questions[0].id, difficulty: "beginner", topic: questions[0].topic, correct: true, skipped: false, hintsUsed: 0, timeMs: 1000 })
    useArenaStore.getState().finishSession({})

    expect(useArenaStore.getState().progress.unlockedAchievements).toContain("first-steps")
    expect(useArenaStore.getState().lastUnlockedAchievements).toContain("first-steps")

    useArenaStore.getState().startSession("python", "beginner", questions)
    useArenaStore.getState().recordAttempt({ questionId: questions[0].id, difficulty: "beginner", topic: questions[0].topic, correct: true, skipped: false, hintsUsed: 0, timeMs: 1000 })
    useArenaStore.getState().finishSession({})

    expect(useArenaStore.getState().progress.unlockedAchievements.filter((id) => id === "first-steps")).toHaveLength(1)
  })

  it("resetProgress clears everything back to defaults", () => {
    const questions = freshQuestions(1)
    useArenaStore.getState().startSession("python", "beginner", questions)
    useArenaStore.getState().recordAttempt({ questionId: questions[0].id, difficulty: "beginner", topic: questions[0].topic, correct: true, skipped: false, hintsUsed: 0, timeMs: 1000 })
    useArenaStore.getState().finishSession({})

    useArenaStore.getState().resetProgress()

    expect(useArenaStore.getState().progress.sessions).toHaveLength(0)
    expect(useArenaStore.getState().progress.xp).toBe(0)
    expect(useArenaStore.getState().activeSession).toBeNull()
  })

  describe("persistence resilience", () => {
    it("recovers instead of crashing when localStorage holds malformed JSON", async () => {
      window.localStorage.setItem("interview-arena-state", "{not valid json!!")

      await expect(useArenaStore.persist.rehydrate()).resolves.not.toThrow()

      // The bad value must not be left behind to keep failing on every future load.
      expect(window.localStorage.getItem("interview-arena-state")).toBeNull()
      expect(useArenaStore.getState().progress.xp).toBe(0)
    })

    it("recovers when the persisted value is valid JSON but not a plausible state object", async () => {
      window.localStorage.setItem("interview-arena-state", JSON.stringify("just a string, not our shape"))

      await expect(useArenaStore.persist.rehydrate()).resolves.not.toThrow()
      expect(useArenaStore.getState().progress).toMatchObject({ xp: 0, sessions: [] })
    })

    it("deep-merges persisted progress so a real session survives rehydration", async () => {
      const questions = freshQuestions(1)
      useArenaStore.getState().startSession("python", "beginner", questions)
      useArenaStore.getState().recordAttempt({ questionId: questions[0].id, difficulty: "beginner", topic: questions[0].topic, correct: true, skipped: false, hintsUsed: 0, timeMs: 1000 })
      useArenaStore.getState().finishSession({})
      const xpBefore = useArenaStore.getState().progress.xp
      expect(xpBefore).toBeGreaterThan(0)

      await useArenaStore.persist.rehydrate()

      expect(useArenaStore.getState().progress.xp).toBe(xpBefore)
      expect(useArenaStore.getState().progress.sessions).toHaveLength(1)
    })

    it("fills in a field missing from an old persisted blob with the current default instead of leaving it undefined", async () => {
      // Simulates a future release adding a new field to UserProgressState --
      // an old persisted blob simply won't have it yet.
      window.localStorage.setItem(
        "interview-arena-state",
        JSON.stringify({
          state: { progress: { xp: 42, sessions: [] /* streakDays, bestStreak, etc. intentionally omitted */ } },
          version: 1,
        }),
      )

      await useArenaStore.persist.rehydrate()

      expect(useArenaStore.getState().progress.xp).toBe(42)
      expect(useArenaStore.getState().progress.streakDays).toBe(0)
      expect(useArenaStore.getState().progress.topicStats).toEqual({})
    })
  })
})
