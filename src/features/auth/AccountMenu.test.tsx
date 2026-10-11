import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderWithRouter } from "@/test/renderWithRouter"

describe("AccountMenu -- guest access without authentication", () => {
  it("renders nothing when cloud accounts aren't configured, never blocking guest play", async () => {
    vi.resetModules()
    vi.doMock("@/lib/supabase/client", () => ({ isSupabaseConfigured: () => false, supabase: null }))
    const { AccountMenu } = await import("./AccountMenu")

    const { container } = renderWithRouter(<AccountMenu />)

    expect(container).toBeEmptyDOMElement()
    vi.doUnmock("@/lib/supabase/client")
  })
})

describe("AccountMenu -- configured", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.doMock("@/lib/supabase/client", () => ({
      isSupabaseConfigured: () => true,
      supabase: { auth: { signOut: vi.fn().mockResolvedValue({ error: null }), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) } },
    }))
  })

  it("shows a Guest indicator and a Sign in affordance for an unauthenticated visitor", async () => {
    const { AccountMenu } = await import("./AccountMenu")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    useAuthStore.setState({ status: "guest", user: null })

    renderWithRouter(<AccountMenu />)

    expect(screen.getByText("Guest")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("opens the welcome auth modal when Sign in is clicked, without navigating away or interrupting the page", async () => {
    const { AccountMenu } = await import("./AccountMenu")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    useAuthStore.setState({ status: "guest", user: null })

    renderWithRouter(<AccountMenu />)
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }))

    expect(await screen.findByText(/welcome to interview arena/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /continue as guest/i })).toBeInTheDocument()
  })

  it("shows the account's email once authenticated, and signs out on request", async () => {
    const { AccountMenu } = await import("./AccountMenu")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    useAuthStore.setState({ status: "authenticated", user: { id: "u1", email: "dev@example.com" } as never })

    renderWithRouter(<AccountMenu />)
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }))

    expect(await screen.findByText("dev@example.com")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }))

    const { supabase } = await import("@/lib/supabase/client")
    expect((supabase as unknown as { auth: { signOut: ReturnType<typeof vi.fn> } }).auth.signOut).toHaveBeenCalled()
  })
})
