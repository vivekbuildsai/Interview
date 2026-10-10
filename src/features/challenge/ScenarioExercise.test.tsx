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
})
