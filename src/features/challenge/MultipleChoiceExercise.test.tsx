import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { MultipleChoiceExercise } from "./MultipleChoiceExercise"
import type { MultipleChoiceQuestion } from "@/lib/types"

const question: MultipleChoiceQuestion = {
  id: "q1",
  gameId: "python",
  topic: "Test",
  difficulty: "beginner",
  type: "multiple-choice",
  prompt: "2 + 2 = ?",
  options: [
    { id: "a", label: "3" },
    { id: "b", label: "4" },
    { id: "c", label: "5" },
  ],
  correctOptionId: "b",
  explanation: "Basic arithmetic.",
}

describe("MultipleChoiceExercise", () => {
  it("disables submit until an option is selected", () => {
    render(<MultipleChoiceExercise question={question} submitted={false} onSubmit={() => {}} />)
    expect(screen.getByRole("button", { name: /submit answer/i })).toBeDisabled()
  })

  it("calls onSubmit(true) when the correct option is selected", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<MultipleChoiceExercise question={question} submitted={false} onSubmit={onSubmit} />)

    await user.click(screen.getByText("4"))
    await user.click(screen.getByRole("button", { name: /submit answer/i }))

    expect(onSubmit).toHaveBeenCalledWith(true)
  })

  it("calls onSubmit(false) when an incorrect option is selected", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<MultipleChoiceExercise question={question} submitted={false} onSubmit={onSubmit} />)

    await user.click(screen.getByText("5"))
    await user.click(screen.getByRole("button", { name: /submit answer/i }))

    expect(onSubmit).toHaveBeenCalledWith(false)
  })

  it("highlights the correct answer and hides the submit button once submitted", () => {
    render(<MultipleChoiceExercise question={question} submitted={true} onSubmit={() => {}} />)
    expect(screen.queryByRole("button", { name: /submit answer/i })).not.toBeInTheDocument()
    const options = screen.getAllByRole("radio")
    expect(options.every((o) => o.hasAttribute("disabled"))).toBe(true)
  })
})
