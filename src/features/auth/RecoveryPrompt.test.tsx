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

describe("RecoveryPrompt", () => {
  it("stays closed when there is no pending recovery", async () => {
    const { RecoveryPrompt } = await import("./RecoveryPrompt")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    useAuthStore.setState({ recoveryPending: false })

    renderWithRouter(<RecoveryPrompt />)

    expect(screen.queryByText(/set a new password/i)).not.toBeInTheDocument()
  })

  it("shows the new-password form when recovery is pending, regardless of which route it's mounted under", async () => {
    const { RecoveryPrompt } = await import("./RecoveryPrompt")
    const { useAuthStore } = await import("@/lib/auth/authStore")
    useAuthStore.setState({ recoveryPending: true })

    renderWithRouter(<RecoveryPrompt />, ["/library"])

    expect(await screen.findByText(/set a new password/i)).toBeInTheDocument()
  })
})
