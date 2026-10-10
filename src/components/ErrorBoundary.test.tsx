import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ErrorBoundary } from "./ErrorBoundary"

function Bomb(): React.ReactElement {
  throw new Error("boom")
}

describe("ErrorBoundary", () => {
  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText("All good")).toBeInTheDocument()
  })

  it("catches a render error and shows a recovery screen instead of crashing the whole app", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByText(/your saved progress is untouched/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reload interview arena/i })).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
