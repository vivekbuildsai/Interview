import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it } from "vitest"
import LibraryPage from "./LibraryPage"
import { useArenaStore } from "@/lib/store"
import { renderWithRouter } from "@/test/renderWithRouter"

beforeEach(() => {
  window.localStorage.clear()
  useArenaStore.getState().resetProgress()
})

describe("LibraryPage", () => {
  it("lists every playable game across every category, with no placeholder 'coming soon' modules left", () => {
    renderWithRouter(<LibraryPage />)
    expect(screen.getByText("Python")).toBeInTheDocument()
    expect(screen.getByText("Kubernetes")).toBeInTheDocument()
    expect(screen.getByText("Java")).toBeInTheDocument()
    expect(screen.getByText("Docker & Containers")).toBeInTheDocument()
    expect(screen.getByText("System Design")).toBeInTheDocument()
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument()
  })

  it("filters games by search query", async () => {
    const user = userEvent.setup()
    renderWithRouter(<LibraryPage />)

    await user.type(screen.getByPlaceholderText(/search games/i), "kubernetes")

    expect(screen.getByText("Kubernetes")).toBeInTheDocument()
    expect(screen.queryByText("Python")).not.toBeInTheDocument()
  })

  it("shows an empty state when no game matches the search", async () => {
    const user = userEvent.setup()
    renderWithRouter(<LibraryPage />)

    await user.type(screen.getByPlaceholderText(/search games/i), "zzz-nonexistent-zzz")

    expect(screen.getByText(/no games match your search/i)).toBeInTheDocument()
  })

  it("filters by category", async () => {
    const user = userEvent.setup()
    renderWithRouter(<LibraryPage />)

    await user.click(screen.getByRole("button", { name: "Telecommunications" }))

    expect(screen.getByText("4G / 5G Networks")).toBeInTheDocument()
    expect(screen.queryByText("Python")).not.toBeInTheDocument()
  })
})
