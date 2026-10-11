// The game registry is the single place that lists every game card the
// Library page renders. Adding a new game -- playable or "coming soon"
// -- never touches the dashboard, navigation, scoring, or persistence
// code; it's purely a new entry here (or a new fully-fledged
// GameDefinition imported from src/games/<id>/index.ts).

import type { Difficulty, GameDefinition, Question } from "./types"
import { pythonGame } from "@/games/python"
import { kubernetesGame } from "@/games/kubernetes"
import { telecomGame } from "@/games/telecom"
import { javaGame } from "@/games/java"
import { cGame } from "@/games/c"
import { cppGame } from "@/games/cpp"
import { typescriptGame } from "@/games/typescript"
import { dsaGame } from "@/games/dsa"
import { oopGame } from "@/games/oop"
import { systemDesignGame } from "@/games/system-design"
import { dockerGame } from "@/games/docker"
import { linuxGame } from "@/games/linux"
import { networkingGame } from "@/games/networking"
import { cicdGame } from "@/games/cicd"
import { cloudArchitectureGame } from "@/games/cloud-architecture"
import { sqlGame } from "@/games/sql"
import { osGame } from "@/games/os"
import { networksCsGame } from "@/games/networks-cs"
import { aiMlGame } from "@/games/ai-ml"
import { llmAgentsGame } from "@/games/llm-agents"
import { testingGame } from "@/games/testing"
import { distributedSystemsGame } from "@/games/distributed-systems"
import { cybersecurityGame } from "@/games/cybersecurity"

export const GAMES: GameDefinition[] = [
  pythonGame,
  kubernetesGame,
  telecomGame,

  // Programming & Coding
  javaGame,
  cGame,
  cppGame,
  typescriptGame,
  dsaGame,
  oopGame,
  systemDesignGame,

  // Cloud & Infrastructure
  dockerGame,
  linuxGame,
  networkingGame,
  cicdGame,
  cloudArchitectureGame,

  // Other domains
  sqlGame,
  osGame,
  networksCsGame,
  aiMlGame,
  llmAgentsGame,
  testingGame,
  distributedSystemsGame,
  cybersecurityGame,
]

export function getGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}

export function getPlayableGames(): GameDefinition[] {
  return GAMES.filter((g) => !g.comingSoon)
}

export const CATEGORIES = Array.from(new Set(GAMES.map((g) => g.category)))

export function findQuestion(id: string): Question | undefined {
  for (const game of GAMES) {
    const q = game.questions.find((q) => q.id === id)
    if (q) return q
  }
  return undefined
}

export function questionsForDifficulty(gameId: string, difficulty: Difficulty): Question[] {
  const game = getGame(gameId)
  if (!game) return []
  return game.questions.filter((q) => q.difficulty === difficulty)
}

// Fisher-Yates, fine for session variety -- nothing security-sensitive here.
export function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function reviewQuestions(reviewQueue: string[]): Question[] {
  return reviewQueue.map((id) => findQuestion(id)).filter((q): q is Question => Boolean(q))
}
