import { create } from "zustand"
import { persist, type PersistStorage } from "zustand/middleware"
import { ACHIEVEMENTS } from "./achievements"
import { newId, todayKey } from "./id"
import { persistentStore } from "./storage"
import { accuracyPct, xpForAttempt } from "./scoring"
import { setDayStatus } from "./studyPlan"
import type { AchievementContext, AttemptRecord, Difficulty, Question, SessionResult, StudyPlan, UserProgressState } from "./types"

export interface ActiveSession {
  id: string
  gameId: string
  difficulty: Difficulty
  questionIds: string[]
  currentIndex: number
  attempts: AttemptRecord[]
  startedAt: number
}

interface ArenaState {
  progress: UserProgressState
  activeSession: ActiveSession | null
  lastSessionResult: SessionResult | null
  lastUnlockedAchievements: string[]

  startSession: (gameId: string, difficulty: Difficulty, questions: Question[]) => void
  recordAttempt: (attempt: Omit<AttemptRecord, "submittedAt">) => void
  advance: () => void
  finishSession: (estimatedSecondsByQuestion: Record<string, number | undefined>) => SessionResult | null
  abandonSession: () => void
  toggleTheme: () => void
  resetProgress: () => void
  clearLastUnlocks: () => void
  // Replaces progress wholesale with the result of a cloud merge/pull
  // (src/lib/cloud). Separate from resetProgress -- this is "adopt this
  // authoritative state," not "erase everything."
  setSyncedProgress: (progress: UserProgressState) => void
  setStudyPlan: (plan: StudyPlan | null) => void
  markStudyPlanDay: (dayIndex: number, status: "completed" | "skipped" | "pending") => void
}

const defaultProgress: UserProgressState = {
  xp: 0,
  sessions: [],
  unlockedAchievements: [],
  lastActiveDateKey: null,
  streakDays: 0,
  bestStreak: 0,
  topicStats: {},
  reviewQueue: [],
  theme: "dark",
  studyPlan: null,
}

function buildAchievementContext(progress: UserProgressState): AchievementContext {
  const allAttempts = progress.sessions.flatMap((s) => s.attempts)
  const gamesPlayed = new Set(progress.sessions.map((s) => s.gameId))
  const difficultiesCleared = new Set(progress.sessions.map((s) => s.difficulty))
  const masteredTopics = new Set(Object.entries(progress.topicStats).filter(([, v]) => v.attempts >= 5 && v.correct / v.attempts >= 0.9).map(([k]) => k))
  const perfectSessions = progress.sessions.filter((s) => s.attempts.length > 0 && s.attempts.every((a) => a.correct)).length

  return {
    totalSessions: progress.sessions.length,
    totalCorrect: allAttempts.filter((a) => a.correct).length,
    totalAttempts: allAttempts.length,
    bestStreak: progress.bestStreak,
    currentStreakDays: progress.streakDays,
    perfectSessions,
    gamesPlayed,
    difficultiesCleared,
    masteredTopics,
  }
}

function updateStreak(progress: UserProgressState): Pick<UserProgressState, "streakDays" | "bestStreak" | "lastActiveDateKey"> {
  const today = todayKey()
  if (progress.lastActiveDateKey === today) {
    return { streakDays: progress.streakDays, bestStreak: progress.bestStreak, lastActiveDateKey: today }
  }
  const yesterday = todayKey(new Date(Date.now() - 86_400_000))
  const continued = progress.lastActiveDateKey === yesterday
  const streakDays = continued ? progress.streakDays + 1 : 1
  return { streakDays, bestStreak: Math.max(progress.bestStreak, streakDays), lastActiveDateKey: today }
}

const zustandStorage: PersistStorage<ArenaState> = {
  getItem: (name) => {
    const raw = persistentStore.getItem(name)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      // Corrupted/malformed JSON (manual edits, a partial write, a future
      // incompatible format) must never crash the app on load -- treat it
      // as "nothing saved" and drop the bad value so it doesn't keep
      // failing to parse on every future load.
      persistentStore.removeItem(name)
      return null
    }
  },
  setItem: (name, value) => persistentStore.setItem(name, JSON.stringify(value)),
  removeItem: (name) => persistentStore.removeItem(name),
}

export const useArenaStore = create<ArenaState>()(
  persist(
    (set, get) => ({
      progress: defaultProgress,
      activeSession: null,
      lastSessionResult: null,
      lastUnlockedAchievements: [],

      startSession: (gameId, difficulty, questions) => {
        set({
          activeSession: {
            id: newId("session"),
            gameId,
            difficulty,
            questionIds: questions.map((q) => q.id),
            currentIndex: 0,
            attempts: [],
            startedAt: Date.now(),
          },
        })
      },

      recordAttempt: (attempt) => {
        const session = get().activeSession
        if (!session) return
        const already = session.attempts.find((a) => a.questionId === attempt.questionId)
        const nextAttempts = already ? session.attempts.map((a) => (a.questionId === attempt.questionId ? { ...attempt, submittedAt: Date.now() } : a)) : [...session.attempts, { ...attempt, submittedAt: Date.now() }]
        set({ activeSession: { ...session, attempts: nextAttempts } })
      },

      advance: () => {
        const session = get().activeSession
        if (!session) return
        set({ activeSession: { ...session, currentIndex: Math.min(session.currentIndex + 1, session.questionIds.length) } })
      },

      finishSession: (estimatedSecondsByQuestion) => {
        const session = get().activeSession
        if (!session) return null

        const xpEarned = session.attempts.reduce((sum, a) => sum + xpForAttempt(a, estimatedSecondsByQuestion[a.questionId]), 0)
        const result: SessionResult = {
          id: session.id,
          gameId: session.gameId,
          difficulty: session.difficulty,
          startedAt: session.startedAt,
          finishedAt: Date.now(),
          attempts: session.attempts,
          xpEarned,
        }

        set((state) => {
          const topicStats = { ...state.progress.topicStats }
          for (const a of session.attempts) {
            const entry = topicStats[a.topic] ?? { correct: 0, attempts: 0 }
            topicStats[a.topic] = { correct: entry.correct + (a.correct ? 1 : 0), attempts: entry.attempts + (a.skipped ? 0 : 1) }
          }

          const reviewQueue = Array.from(
            new Set([...state.progress.reviewQueue.filter((id) => !session.attempts.some((a) => a.questionId === id && a.correct)), ...session.attempts.filter((a) => !a.correct && !a.skipped).map((a) => a.questionId)]),
          )

          const streakPatch = updateStreak(state.progress)
          const nextProgress: UserProgressState = {
            ...state.progress,
            xp: state.progress.xp + xpEarned,
            sessions: [...state.progress.sessions, result],
            topicStats,
            reviewQueue,
            ...streakPatch,
          }

          const ctx = buildAchievementContext(nextProgress)
          const newlyUnlocked = ACHIEVEMENTS.filter((a) => !nextProgress.unlockedAchievements.includes(a.id) && a.check(ctx)).map((a) => a.id)
          nextProgress.unlockedAchievements = [...nextProgress.unlockedAchievements, ...newlyUnlocked]

          return {
            progress: nextProgress,
            activeSession: null,
            lastSessionResult: result,
            lastUnlockedAchievements: newlyUnlocked,
          }
        })

        return result
      },

      abandonSession: () => set({ activeSession: null }),

      toggleTheme: () =>
        set((state) => ({
          progress: { ...state.progress, theme: state.progress.theme === "dark" ? "light" : "dark" },
        })),

      resetProgress: () => set({ progress: defaultProgress, activeSession: null, lastSessionResult: null, lastUnlockedAchievements: [] }),

      clearLastUnlocks: () => set({ lastUnlockedAchievements: [] }),

      setSyncedProgress: (progress) => set({ progress }),

      setStudyPlan: (plan) => set((state) => ({ progress: { ...state.progress, studyPlan: plan } })),

      markStudyPlanDay: (dayIndex, status) =>
        set((state) => {
          if (!state.progress.studyPlan) return state
          return { progress: { ...state.progress, studyPlan: setDayStatus(state.progress.studyPlan, dayIndex, status) } }
        }),
    }),
    {
      name: "interview-arena-state",
      storage: zustandStorage,
      version: 1,
      // A plain top-level merge (zustand's default) would replace
      // `progress` wholesale with whatever was persisted -- so a future
      // release that adds a new field to defaultProgress would have that
      // field silently missing for every existing user until a fresh
      // reset. Deep-merging `progress` specifically keeps new fields
      // defaulted while preserving everything the user already earned.
      // A persisted blob that isn't a plausible object at all (corrupted
      // write, unrelated data under the same key) is ignored outright --
      // never spread into state, which previously could crash child
      // components expecting known fields to exist.
      merge: (persistedState, currentState) => {
        if (typeof persistedState !== "object" || persistedState === null) {
          return currentState
        }
        const persisted = persistedState as Partial<ArenaState>
        const persistedProgress = typeof persisted.progress === "object" && persisted.progress !== null ? persisted.progress : {}
        return {
          ...currentState,
          ...persisted,
          progress: { ...currentState.progress, ...persistedProgress },
        }
      },
    },
  ),
)

export function sessionAccuracy(session: SessionResult): number {
  return accuracyPct(session.attempts)
}
