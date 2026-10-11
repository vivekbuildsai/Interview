import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { ScenarioExercise } from "./ScenarioExercise"
import type { ScenarioQuestion } from "@/lib/types"

const question: ScenarioQuestion = {
  id: "q1",
  gameId: "python",
  topic: "Test",
  difficulty: "hard",
  type: "scenario",
  prompt: "Explain X.",
  rubric: ["Mentions A", "Mentions B"],
  modelAnswer: "A full explanation of X.",
  explanation: "Compare against the rubric.",
}

const nextQuestion: ScenarioQuestion = {
  ...question,
  id: "q2",
  prompt: "Explain Y.",
  rubric: ["Mentions C"],
  modelAnswer: "A full explanation of Y.",
}

describe("ScenarioExercise", () => {
  it("hides the model answer and self-assessment until revealed", () => {
    render(<ScenarioExercise question={question} submitted={false} onSubmit={() => {}} />)
    expect(screen.queryByText(question.modelAnswer)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reveal model answer/i })).toBeInTheDocument()
  })

  it("reveals the rubric and model answer, then lets the user self-assess", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ScenarioExercise question={question} submitted={false} onSubmit={onSubmit} />)

    await user.click(screen.getByRole("button", { name: /reveal model answer/i }))

    expect(screen.getByText(question.modelAnswer)).toBeInTheDocument()
    expect(screen.getByText("Mentions A")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /i nailed it/i }))
    expect(onSubmit).toHaveBeenCalledWith(true)
  })

  it("reports false when the user marks their answer as needing review", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ScenarioExercise question={question} submitted={false} onSubmit={onSubmit} />)

    await user.click(screen.getByRole("button", { name: /reveal model answer/i }))
    await user.click(screen.getByRole("button", { name: /needs review/i }))

    expect(onSubmit).toHaveBeenCalledWith(false)
  })

  it("starts a new question hidden even when it mounts while the parent's submitted state is still momentarily true", async () => {
    // Regression test: reproduces a real bug found live. ChallengePage
    // resets its own `submitted` state back to false in a useEffect that
    // runs *after* the render that first mounts the next question -- so a
    // naive `useState(submitted)` here would capture a stale `true` from
    // the question just answered and show the next question's model
    // answer immediately, with no "Reveal" click. Rerendering with a new
    // question id while still passing submitted=true reproduces exactly
    // that transitional moment.
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const { rerender } = render(<ScenarioExercise question={question} submitted={false} onSubmit={onSubmit} />)
    await user.click(screen.getByRole("button", { name: /reveal model answer/i }))
    await user.click(screen.getByRole("button", { name: /i nailed it/i }))

    rerender(<ScenarioExercise question={nextQuestion} submitted={true} onSubmit={onSubmit} />)

    expect(screen.queryByText(nextQuestion.modelAnswer)).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reveal model answer/i })).toBeInTheDocument()
  })
})
