import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderWithRouter } from "@/test/renderWithRouter"

beforeEach(() => {
  window.localStorage.clear()
  vi.resetModules()
})

describe("WelcomeGate", () => {
  it("does nothing when cloud accounts aren't configured", async () => {
    vi.doMock("@/lib/supabase/client", () => ({ isSupabaseConfigured: () => false, supabase: null }))
    const { WelcomeGate } = await import("./WelcomeGate")
    const { container } = renderWithRouter(<WelcomeGate />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the welcome screen once, on a true first visit with no prior choice and no existing progress", async () => {
    vi.doMock("@/lib/supabase/client", () => ({
      isSupabaseConfigured: () => true,
      supabase: { auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) } },
    }))
    const { WelcomeGate } = await import("./WelcomeGate")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    useAuthStore.setState({ status: "guest" })

    renderWithRouter(<WelcomeGate />)

    expect(await screen.findByText(/welcome to interview arena/i)).toBeInTheDocument()
  })

  it("never shows the welcome screen for an existing user who already has local progress", async () => {
    vi.doMock("@/lib/supabase/client", () => ({
      isSupabaseConfigured: () => true,
      supabase: { auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) } },
    }))
    const { WelcomeGate } = await import("./WelcomeGate")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    const { useArenaStore } = await import("@/lib/store")
    useAuthStore.setState({ status: "guest" })
    useArenaStore.setState((state) => ({ progress: { ...state.progress, sessions: [{ id: "s1", gameId: "python", difficulty: "beginner", startedAt: 0, finishedAt: 0, attempts: [], xpEarned: 0 }] } }))

    renderWithRouter(<WelcomeGate />)

    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText(/welcome to interview arena/i)).not.toBeInTheDocument()
  })

  it("never shows the welcome screen once the user is already authenticated", async () => {
    vi.doMock("@/lib/supabase/client", () => ({
      isSupabaseConfigured: () => true,
      supabase: { auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) } },
    }))
    const { WelcomeGate } = await import("./WelcomeGate")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    useAuthStore.setState({ status: "authenticated", user: { id: "u1" } as never })

    renderWithRouter(<WelcomeGate />)

    await new Promise((r) => setTimeout(r, 0))
    expect(screen.queryByText(/welcome to interview arena/i)).not.toBeInTheDocument()
  })
})
