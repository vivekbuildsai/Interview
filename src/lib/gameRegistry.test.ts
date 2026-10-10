import { describe, expect, it } from "vitest"
import { findQuestion, getGame, getPlayableGames, questionsForDifficulty, shuffled, GAMES } from "./gameRegistry"
import { DIFFICULTIES } from "./types"

describe("gameRegistry", () => {
  it("every playable game has at least one question per difficulty it claims to support", () => {
    for (const game of getPlayableGames()) {
      const difficultiesPresent = new Set(game.questions.map((q) => q.difficulty))
      expect(difficultiesPresent.size).toBeGreaterThan(0)
      for (const d of difficultiesPresent) {
        expect(questionsForDifficulty(game.id, d).length).toBeGreaterThan(0)
      }
    }
  })

  it("every question id is globally unique", () => {
    const allIds = GAMES.flatMap((g) => g.questions.map((q) => q.id))
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it("findQuestion locates a question across any game", () => {
    const pythonGame = getGame("python")!
    const first = pythonGame.questions[0]
    expect(findQuestion(first.id)?.id).toBe(first.id)
    expect(findQuestion("does-not-exist")).toBeUndefined()
  })

  it("shuffled returns the same elements in (likely) different order, without mutating the input", () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8]
    const result = shuffled(original)
    expect(result).toHaveLength(original.length)
    expect([...result].sort()).toEqual([...original].sort())
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it("python supports all five difficulty levels with real content", () => {
    const python = getGame("python")!
    for (const difficulty of DIFFICULTIES) {
      expect(questionsForDifficulty(python.id, difficulty).length).toBeGreaterThan(0)
    }
  })

  it("coming-soon games declare no questions and are excluded from getPlayableGames", () => {
    const comingSoon = GAMES.filter((g) => g.comingSoon)
    expect(comingSoon.length).toBeGreaterThan(0)
    for (const g of comingSoon) {
      expect(g.questions).toHaveLength(0)
    }
    expect(getPlayableGames().some((g) => g.comingSoon)).toBe(false)
  })
})
