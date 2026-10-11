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

    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
  })

  it("redirects back to the remembered return path once the session resolves (not /auth/callback itself)", async () => {
    window.sessionStorage.setItem("interview-arena-auth-return-path", "/settings")
    const { default: AuthCallbackPage } = await import("./AuthCallbackPage")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    useAuthStore.setState({ status: "authenticated", user: { id: "u1" } as never })

    renderWithRouter(<AuthCallbackPage />, ["/auth/callback"])

    // The remembered path is consumed (one-shot) once this resolves.
    expect(window.sessionStorage.getItem("interview-arena-auth-return-path")).toBeNull()
  })
})
