import { describe, expect, it, vi, beforeEach } from "vitest"

const getSessionMock = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  supabase: { auth: { getSession: (...args: unknown[]) => getSessionMock(...args) } },
}))

describe("askCoach", () => {
  beforeEach(() => {
    getSessionMock.mockReset()
    vi.restoreAllMocks()
  })

  it("reports unauthenticated without calling the network when there's no session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } })
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const { askCoach } = await import("./aiCoach")

    const result = await askCoach("How does a hash map work?")

    expect(result).toEqual({ ok: false, reason: "unauthenticated", message: "Sign in to use the AI coach." })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("returns the reply on success, sending the bearer token", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-123" } } })
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ reply: "Use a hash table.", configured: true }), { status: 200 }))
    const { askCoach } = await import("./aiCoach")

    const result = await askCoach("How does a hash map work?", { gameName: "DSA", difficulty: "beginner" })

    expect(result).toEqual({ ok: true, reply: "Use a hash table." })
    expect(fetchSpy).toHaveBeenCalledWith("/api/coach", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ authorization: "Bearer token-123" }) }))
  })

  it("reports not_configured on a 501, without fabricating a reply", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-123" } } })
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "The AI coach isn't configured yet." }), { status: 501 }))
    const { askCoach } = await import("./aiCoach")

    const result = await askCoach("hello")

    expect(result).toEqual({ ok: false, reason: "not_configured", message: "The AI coach isn't configured yet." })
  })

  it("reports rate_limited on a 429", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-123" } } })
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Too many questions." }), { status: 429 }))
    const { askCoach } = await import("./aiCoach")

    const result = await askCoach("hello")

    expect(result).toEqual({ ok: false, reason: "rate_limited", message: "Too many questions." })
  })

  it("reports a generic error without throwing when the network request itself fails", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: "token-123" } } })
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"))
    const { askCoach } = await import("./aiCoach")

    const result = await askCoach("hello")

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("error")
  })
})
