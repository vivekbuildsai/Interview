import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import DashboardPage from "./DashboardPage"
import { useArenaStore } from "@/lib/store"
import { renderWithRouter } from "@/test/renderWithRouter"
import { pythonGame } from "@/games/python"

beforeEach(() => {
  window.localStorage.clear()
  useArenaStore.getState().resetProgress()
})

describe("DashboardPage", () => {
  it("shows an honest first-time onboarding state with no fabricated stats", () => {
    renderWithRouter(<DashboardPage />)
    expect(screen.getByText(/ready to train/i)).toBeInTheDocument()
    expect(screen.getByText(/your journey starts here/i)).toBeInTheDocument()
    // No stat cards (level/streak/accuracy/sessions) before any real activity.
    expect(screen.queryByText(/current streak/i)).not.toBeInTheDocument()
  })

  it("shows real stats once a session has actually been played", () => {
    const questions = pythonGame.questions.filter((q) => q.difficulty === "beginner").slice(0, 1)
    useArenaStore.getState().startSession("python", "beginner", questions)
    useArenaStore.getState().recordAttempt({ questionId: questions[0].id, difficulty: "beginner", topic: questions[0].topic, correct: true, skipped: false, hintsUsed: 0, timeMs: 1000 })
    useArenaStore.getState().finishSession({})

    renderWithRouter(<DashboardPage />)

    expect(screen.getByText(/current streak/i)).toBeInTheDocument()
    expect(screen.getByText(/sessions played/i)).toBeInTheDocument()
    expect(screen.queryByText(/your journey starts here/i)).not.toBeInTheDocument()
  })

  it("renders the daily challenge with a real, playable game", () => {
    renderWithRouter(<DashboardPage />)
    expect(screen.getByText(/daily challenge/i)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /take today's challenge/i })).toBeInTheDocument()
  })
})
