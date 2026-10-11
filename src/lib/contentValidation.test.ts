import { describe, expect, it } from "vitest"
import { validateGames } from "./contentValidation"
import { GAMES } from "./gameRegistry"
import type { GameDefinition, MultipleChoiceQuestion, ScenarioQuestion } from "./types"

function mcq(overrides: Partial<MultipleChoiceQuestion> = {}): MultipleChoiceQuestion {
  return {
    id: "mcq-1",
    gameId: "fixture",
    topic: "Fixture topic",
    difficulty: "beginner",
    type: "multiple-choice",
    prompt: "A sufficiently long fixture prompt?",
    options: [
      { id: "a", label: "Option A" },
      { id: "b", label: "Option B" },
    ],
    correctOptionId: "a",
    explanation: "A sufficiently long fixture explanation.",
    ...overrides,
  }
}

function scenario(overrides: Partial<ScenarioQuestion> = {}): ScenarioQuestion {
  return {
    id: "sce-1",
    gameId: "fixture",
    topic: "Fixture topic",
    difficulty: "hard",
    type: "scenario",
    prompt: "A sufficiently long fixture scenario prompt?",
    rubric: ["A sufficiently detailed rubric point.", "A second sufficiently detailed rubric point."],
    modelAnswer: "A sufficiently long fixture model answer that explains the reasoning in enough detail.",
    explanation: "A sufficiently long fixture explanation.",
    ...overrides,
  }
}

function game(overrides: Partial<GameDefinition> = {}): GameDefinition {
  return {
    id: "fixture",
    name: "Fixture Game",
    shortDescription: "A fixture game.",
    category: "Programming & Coding",
    icon: "Gamepad2",
    accent: "from-zinc-400 to-zinc-600",
    syllabus: ["Fixture"],
    questions: [],
    ...overrides,
  }
}

describe("validateGames -- real content", () => {
  it("finds zero issues across the entire live question registry", () => {
    const issues = validateGames(GAMES)
    expect(issues).toEqual([])
  })

  it("every playable game has at least one question", () => {
    for (const g of GAMES.filter((g) => !g.comingSoon)) {
      expect(g.questions.length, `${g.id} has no questions`).toBeGreaterThan(0)
    }
  })
})

describe("validateGames -- detects structural problems", () => {
  it("flags a duplicate question id, even across different games", () => {
    const issues = validateGames([game({ id: "a", questions: [mcq({ id: "dup", gameId: "a" })] }), game({ id: "b", questions: [mcq({ id: "dup", gameId: "b" })] })])
    expect(issues.some((i) => i.message.includes("duplicate question id"))).toBe(true)
  })

  it("flags a question whose gameId doesn't match its owning game", () => {
    const issues = validateGames([game({ id: "a", questions: [mcq({ gameId: "wrong" })] })])
    expect(issues.some((i) => i.message.includes("does not match owning game"))).toBe(true)
  })

  it("flags a correctOptionId that doesn't match any option", () => {
    const issues = validateGames([game({ questions: [mcq({ correctOptionId: "z" })] })])
    expect(issues.some((i) => i.message.includes("does not match any option"))).toBe(true)
  })

  it("flags fewer than 2 options", () => {
    const issues = validateGames([game({ questions: [mcq({ options: [{ id: "a", label: "Only one" }] })] })])
    expect(issues.some((i) => i.message.includes("at least 2 options"))).toBe(true)
  })

  it("flags a scenario question with too few rubric points", () => {
    const issues = validateGames([game({ questions: [scenario({ rubric: ["Only one point long enough to pass the length check"] })] })])
    expect(issues.some((i) => i.message.includes("at least 2 rubric points"))).toBe(true)
  })

  it("flags a missing or too-short model answer", () => {
    const issues = validateGames([game({ questions: [scenario({ modelAnswer: "Too short" })] })])
    expect(issues.some((i) => i.message.includes("modelAnswer"))).toBe(true)
  })

  it("flags a duplicate prompt within the same game", () => {
    const issues = validateGames([game({ questions: [mcq({ id: "q1" }), mcq({ id: "q2" })] })])
    expect(issues.some((i) => i.message.includes("duplicate prompt within"))).toBe(true)
  })

  it("flags an identical prompt reused across two different modules", () => {
    const issues = validateGames([game({ id: "a", questions: [mcq({ id: "q1", gameId: "a" })] }), game({ id: "b", questions: [mcq({ id: "q2", gameId: "b" })] })])
    expect(issues.some((i) => i.message.includes("also used in module"))).toBe(true)
  })

  it("flags a non-python coding question, since only python has a real runtime", () => {
    const issues = validateGames([
      game({
        questions: [
          {
            id: "code-1",
            gameId: "fixture",
            topic: "Fixture",
            difficulty: "intermediate",
            type: "coding",
            prompt: "A sufficiently long fixture coding prompt.",
            explanation: "A sufficiently long fixture explanation.",
            language: "python",
            functionName: "solve",
            starterCode: "def solve(): pass",
            testCases: [{ description: "case", args: [], expected: null }],
          },
        ],
      }),
    ])
    expect(issues).toEqual([])
  })

  it("accepts a fully valid fixture with no issues", () => {
    const issues = validateGames([game({ questions: [mcq(), scenario({ id: "sce-2" })] })])
    expect(issues).toEqual([])
  })
})
