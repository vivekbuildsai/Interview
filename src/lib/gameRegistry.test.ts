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

  it("every registered game is genuinely playable -- no module is left as a placeholder", () => {
    // Every domain that used to be a "coming soon" placeholder now has
    // real content; a comingSoon game with zero questions would be a
    // regression back to a placeholder, so this is asserted directly
    // rather than just "some games are playable".
    for (const game of GAMES) {
      expect(game.comingSoon).toBeFalsy()
      expect(game.questions.length).toBeGreaterThan(0)
    }
    expect(getPlayableGames()).toHaveLength(GAMES.length)
  })

  it("covers at least 20 distinct domains with real content, not a handful of samples", () => {
    expect(GAMES.length).toBeGreaterThanOrEqual(20)
  })
})
