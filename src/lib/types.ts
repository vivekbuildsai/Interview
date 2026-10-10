// Core domain schema for the whole platform. Every game (Python,
// Kubernetes, 4G/5G, ...) is just data conforming to these types -- the
// engine, dashboard, scoring, and persistence never know which game
// they're looking at.

export type Difficulty = "beginner" | "intermediate" | "hard" | "veryHard" | "extreme"

export const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "hard", "veryHard", "extreme"]

export const DIFFICULTY_META: Record<Difficulty, { label: string; short: string; description: string; learn: string; color: string }> = {
  beginner: {
    label: "Beginner",
    short: "Lv.1",
    description: "Start from zero -- terminology, foundational concepts, and basic syntax.",
    learn: "Core vocabulary, syntax, and the simplest correct way to do something.",
    color: "from-emerald-400 to-emerald-600",
  },
  intermediate: {
    label: "Intermediate",
    short: "Lv.2",
    description: "Apply concepts through practical exercises, output prediction, and debugging.",
    learn: "Reading real code, predicting behavior, and fixing small mistakes.",
    color: "from-cyan-400 to-blue-500",
  },
  hard: {
    label: "Hard",
    short: "Lv.3",
    description: "Multi-step problems that require reasoning through technical scenarios.",
    learn: "Combining several concepts at once and reasoning about trade-offs.",
    color: "from-blue-500 to-indigo-600",
  },
  veryHard: {
    label: "Very Hard",
    short: "Lv.4",
    description: "Senior-level engineering: performance, concurrency, architecture, troubleshooting.",
    learn: "Senior-level judgment -- what breaks, why, and how to defend a design.",
    color: "from-violet-500 to-purple-600",
  },
  extreme: {
    label: "Extreme",
    short: "Lv.5",
    description: "Brutal edge cases, advanced algorithms, and deep technical reasoning.",
    learn: "The questions that separate a strong engineer from an exceptional one.",
    color: "from-fuchsia-500 to-rose-600",
  },
}

export type ExerciseType = "multiple-choice" | "coding" | "debugging" | "scenario" | "system-design"

export interface QuestionBase {
  id: string
  gameId: string
  topic: string
  difficulty: Difficulty
  type: ExerciseType
  prompt: string
  hints?: string[]
  explanation: string
  tags?: string[]
  prerequisites?: string[]
  estimatedSeconds?: number
}

export interface MultipleChoiceOption {
  id: string
  label: string
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: "multiple-choice"
  options: MultipleChoiceOption[]
  correctOptionId: string
}

export interface CodeTestCase {
  description: string
  args: unknown[]
  expected: unknown
}

export interface CodingQuestion extends QuestionBase {
  type: "coding" | "debugging"
  language: "python"
  functionName: string
  starterCode: string
  solutionCode?: string
  testCases: CodeTestCase[]
}

export interface ScenarioQuestion extends QuestionBase {
  type: "scenario" | "system-design"
  rubric: string[]
  modelAnswer: string
}

export type Question = MultipleChoiceQuestion | CodingQuestion | ScenarioQuestion

export interface GameDefinition {
  id: string
  name: string
  shortDescription: string
  category: "Programming & Coding" | "Telecommunications" | "Cloud & Infrastructure"
  icon: string
  accent: string
  syllabus: string[]
  questions: Question[]
  comingSoon?: boolean
}

export interface AttemptRecord {
  questionId: string
  difficulty: Difficulty
  topic: string
  correct: boolean
  skipped: boolean
  timeMs: number
  hintsUsed: number
  submittedAt: number
}

export interface SessionResult {
  id: string
  gameId: string
  difficulty: Difficulty
  startedAt: number
  finishedAt: number
  attempts: AttemptRecord[]
  xpEarned: number
}

export interface AchievementDef {
  id: string
  title: string
  description: string
  icon: string
  check: (ctx: AchievementContext) => boolean
}

export interface AchievementContext {
  totalSessions: number
  totalCorrect: number
  totalAttempts: number
  bestStreak: number
  currentStreakDays: number
  perfectSessions: number
  gamesPlayed: Set<string>
  difficultiesCleared: Set<Difficulty>
  masteredTopics: Set<string>
}

export interface UserProgressState {
  xp: number
  sessions: SessionResult[]
  unlockedAchievements: string[]
  lastActiveDateKey: string | null
  streakDays: number
  bestStreak: number
  topicStats: Record<string, { correct: number; attempts: number }>
  reviewQueue: string[] // question ids answered incorrectly, for a review quest
  theme: "dark" | "light"
}
