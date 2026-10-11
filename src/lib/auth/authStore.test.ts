import { beforeEach, describe, expect, it, vi } from "vitest"

const authMock = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}

vi.mock("@/lib/supabase/client", () => ({
  isSupabaseConfigured: () => true,
  supabase: { auth: authMock },
}))

async function importFreshAuthStore() {
  vi.resetModules()
  return await import("./authStore")
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  vi.clearAllMocks()
})

describe("useAuthStore -- email/password flows", () => {
  it("signUpWithEmail calls supabase.auth.signUp and reports success", async () => {
    authMock.signUp.mockResolvedValue({ error: null })
    const { useAuthStore } = await importFreshAuthStore()

    const result = await useAuthStore.getState().signUpWithEmail("a@b.com", "password123")

    expect(result).toEqual({ ok: true })
    expect(authMock.signUp).toHaveBeenCalledWith({ email: "a@b.com", password: "password123", options: { emailRedirectTo: expect.stringContaining("/auth/callback") } })
  })

  it("signUpWithEmail surfaces the provider's error message instead of throwing", async () => {
    authMock.signUp.mockResolvedValue({ error: { message: "Email already registered" } })
    const { useAuthStore } = await importFreshAuthStore()

    const result = await useAuthStore.getState().signUpWithEmail("a@b.com", "password123")

    expect(result).toEqual({ ok: false, error: "Email already registered" })
  })

  it("signInWithEmail calls supabase.auth.signInWithPassword", async () => {
    authMock.signInWithPassword.mockResolvedValue({ error: null })
    const { useAuthStore } = await importFreshAuthStore()

    const result = await useAuthStore.getState().signInWithEmail("a@b.com", "password123")

    expect(result).toEqual({ ok: true })
    expect(authMock.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "password123" })
  })

  it("signInWithEmail reports a wrong-password error without throwing", async () => {
    authMock.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } })
    const { useAuthStore } = await importFreshAuthStore()

    const result = await useAuthStore.getState().signInWithEmail("a@b.com", "wrong")

    expect(result).toEqual({ ok: false, error: "Invalid login credentials" })
  })

  it("signOut calls supabase.auth.signOut", async () => {
    authMock.signOut.mockResolvedValue({ error: null })
    const { useAuthStore } = await importFreshAuthStore()

    const result = await useAuthStore.getState().signOut()

    expect(result).toEqual({ ok: true })
    expect(authMock.signOut).toHaveBeenCalled()
  })

  it("sendPasswordReset and updatePassword delegate to the provider and surface errors honestly", async () => {
    authMock.resetPasswordForEmail.mockResolvedValue({ error: null })
    authMock.updateUser.mockResolvedValue({ error: { message: "Password too short" } })
    const { useAuthStore } = await importFreshAuthStore()

    expect(await useAuthStore.getState().sendPasswordReset("a@b.com")).toEqual({ ok: true })
    expect(await useAuthStore.getState().updatePassword("short")).toEqual({ ok: false, error: "Password too short" })
  })
})

describe("useAuthStore -- session state transitions", () => {
  it("initAuth subscribes once, and moves status to authenticated when a session arrives", async () => {
    let capturedCallback: ((event: string, session: unknown) => void) | undefined
    authMock.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      capturedCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    const { useAuthStore } = await importFreshAuthStore()

    useAuthStore.getState().initAuth()
    expect(useAuthStore.getState().status).toBe("loading")

    capturedCallback!("SIGNED_IN", { user: { id: "user-1", email: "a@b.com" } })

    expect(useAuthStore.getState().status).toBe("authenticated")
    expect(useAuthStore.getState().user).toEqual({ id: "user-1", email: "a@b.com" })
  })

  it("moves status back to guest when the session is cleared (sign-out)", async () => {
    let capturedCallback: ((event: string, session: unknown) => void) | undefined
    authMock.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      capturedCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    const { useAuthStore } = await importFreshAuthStore()
    useAuthStore.getState().initAuth()

    capturedCallback!("SIGNED_IN", { user: { id: "user-1" } })
    expect(useAuthStore.getState().status).toBe("authenticated")

    capturedCallback!("SIGNED_OUT", null)
    expect(useAuthStore.getState().status).toBe("guest")
    expect(useAuthStore.getState().user).toBeNull()
  })

  it("sets recoveryPending on a PASSWORD_RECOVERY event, independent of session presence", async () => {
    let capturedCallback: ((event: string, session: unknown) => void) | undefined
    authMock.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      capturedCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    const { useAuthStore } = await importFreshAuthStore()
    useAuthStore.getState().initAuth()

    capturedCallback!("PASSWORD_RECOVERY", { user: { id: "user-1" } })

    expect(useAuthStore.getState().recoveryPending).toBe(true)
    useAuthStore.getState().clearRecoveryPending()
    expect(useAuthStore.getState().recoveryPending).toBe(false)
  })
})

describe("useAuthStore -- guest entry choice", () => {
  it("records and reports a guest choice via persistent storage", async () => {
    const { useAuthStore } = await importFreshAuthStore()
    expect(useAuthStore.getState().hasMadeEntryChoice()).toBe(false)
    useAuthStore.getState().recordGuestChoice()
    expect(useAuthStore.getState().hasMadeEntryChoice()).toBe(true)
  })
})
