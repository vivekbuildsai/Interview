import { screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderWithRouter } from "@/test/renderWithRouter"

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: () => true,
  supabase: { auth: { onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) } },
}))

beforeEach(() => {
  vi.resetModules()
  window.sessionStorage.clear()
})

describe("AuthCallbackPage", () => {
  it("shows a loader while the session is still being established from the URL", async () => {
    const { default: AuthCallbackPage } = await import("./AuthCallbackPage")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    useAuthStore.setState({ status: "loading" })

    renderWithRouter(<AuthCallbackPage />)

    expect(screen.queryByText(/set a new password/i)).not.toBeInTheDocument()
  })

  it("shows the new-password form instead of redirecting when this is a password-recovery link", async () => {
    const { default: AuthCallbackPage } = await import("./AuthCallbackPage")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    useAuthStore.setState({ status: "authenticated", user: { id: "u1" } as never, recoveryPending: true })

    renderWithRouter(<AuthCallbackPage />)

    expect(await screen.findByText(/set a new password/i)).toBeInTheDocument()
  })
})
