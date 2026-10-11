// Automated integrity checks for every question bank, run against the
// real GAMES registry by contentValidation.test.ts. This is the gate
// the spec requires before trusting "content was expanded" -- it
// catches the structural mistakes that are easy to introduce when
// hand-writing dozens of questions (duplicate/missing ids, a
// correctOptionId that doesn't match any option, an empty rubric,
// identical prompts copy-pasted across modules) without trying to judge
// whether the technical content itself is true, which no automated
// check here can verify.

import { DIFFICULTIES } from "./types"
import type { GameDefinition, Question } from "./types"

export interface ContentIssue {
  gameId: string
  questionId: string
  message: string
}

function normalizedPrompt(prompt: string): string {
  return prompt.trim().toLowerCase().replace(/\s+/g, " ")
}

export function validateGames(games: GameDefinition[]): ContentIssue[] {
  const issues: ContentIssue[] = []
  const seenIds = new Map<string, string>() // question id -> owning gameId
  const seenPrompts = new Map<string, { gameId: string; questionId: string }>()
  const seenGameIds = new Set<string>()

  for (const game of games) {
    if (seenGameIds.has(game.id)) {
      issues.push({ gameId: game.id, questionId: "(none)", message: `duplicate game id "${game.id}" in registry` })
    }
    seenGameIds.add(game.id)

    for (const q of game.questions) {
      const report = (message: string) => issues.push({ gameId: game.id, questionId: q.id ?? "(missing id)", message })

      if (!q.id || !q.id.trim()) report("missing id")
      else if (seenIds.has(q.id)) report(`duplicate question id, already used by game "${seenIds.get(q.id)}"`)
      else seenIds.set(q.id, game.id)

      if (q.gameId !== game.id) report(`question.gameId "${q.gameId}" does not match owning game "${game.id}"`)
      if (!q.topic || !q.topic.trim()) report("missing topic")
      if (!DIFFICULTIES.includes(q.difficulty)) report(`invalid difficulty "${q.difficulty}"`)
      if (!q.prompt || q.prompt.trim().length < 10) report("prompt is missing or too short")
      if (!q.explanation || q.explanation.trim().length < 20) report("explanation is missing or too short")
      if (q.hints) {
        for (const hint of q.hints) if (!hint || !hint.trim()) report("has an empty hint")
      }
      if (typeof q.estimatedSeconds === "number" && q.estimatedSeconds <= 0) report("estimatedSeconds must be positive")

      const normalized = q.prompt ? normalizedPrompt(q.prompt) : ""
      if (normalized) {
        const existing = seenPrompts.get(normalized)
        if (existing && existing.gameId === game.id) {
          report(`duplicate prompt within "${game.id}" (also used by ${existing.questionId})`)
        } else if (existing) {
          report(`identical prompt also used in module "${existing.gameId}" (${existing.questionId}) -- modules must not share generic questions`)
        } else {
          seenPrompts.set(normalized, { gameId: game.id, questionId: q.id })
        }
      }

      validateByType(q, report)
    }
  }

  return issues
}

function validateByType(q: Question, report: (message: string) => void) {
  if (q.type === "multiple-choice") {
    if (!q.options || q.options.length < 2) {
      report("multiple-choice question needs at least 2 options")
      return
    }
    const optionIds = new Set<string>()
    for (const option of q.options) {
      if (!option.label || !option.label.trim()) report(`option "${option.id}" has an empty label`)
      if (optionIds.has(option.id)) report(`duplicate option id "${option.id}"`)
      optionIds.add(option.id)
    }
    if (!q.options.some((o) => o.id === q.correctOptionId)) report(`correctOptionId "${q.correctOptionId}" does not match any option`)
    return
  }

  if (q.type === "scenario" || q.type === "system-design") {
    if (!q.rubric || q.rubric.length < 2) report("scenario/system-design question needs at least 2 rubric points")
    else if (q.rubric.some((r) => !r || r.trim().length < 10)) report("has a rubric point that is missing or too short")
    if (!q.modelAnswer || q.modelAnswer.trim().length < 40) report("modelAnswer is missing or too short")
    return
  }

  if (q.type === "coding" || q.type === "debugging") {
    // Only Python has a real execution runtime (Pyodide) -- a coding/
    // debugging question in any other language would have nothing
    // real to run it against, which would misrepresent to the player
    // that their code was actually executed and checked.
    if (q.language !== "python") report(`coding/debugging questions only have a real runtime for python, got "${q.language}"`)
    if (!q.functionName || !q.functionName.trim()) report("missing functionName")
    if (!q.starterCode || !q.starterCode.trim()) report("missing starterCode")
    if (!q.testCases || q.testCases.length === 0) report("needs at least one test case")
  }
}

export function validationSummary(games: GameDefinition[]) {
  const issues = validateGames(games)
  return {
    issues,
    issueCount: issues.length,
    questionCount: games.reduce((sum, g) => sum + g.questions.length, 0),
  }
}
