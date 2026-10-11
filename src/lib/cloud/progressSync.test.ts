import { describe, expect, it, vi } from "vitest"

const rpcMock = vi.fn()
const fromMock = vi.fn()

vi.mock("@/lib/supabase/client", () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args), rpc: (...args: unknown[]) => rpcMock(...args) },
}))

function queryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.order = vi.fn(() => Promise.resolve(result))
  builder.maybeSingle = vi.fn(() => Promise.resolve(result))
  builder.upsert = vi.fn(() => Promise.resolve(result))
  return builder
}

describe("fetchCloudProgress", () => {
  it("maps an empty account (no row yet) to default-shaped zero progress instead of erroring", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "user_progress") return queryBuilder({ data: null, error: null })
      return queryBuilder({ data: [], error: null })
    })
    const { fetchCloudProgress } = await import("./progressSync")

    const result = await fetchCloudProgress("user-1")

    expect(result).toEqual({ ok: true, data: { xp: 0, unlockedAchievements: [], lastActiveDateKey: null, streakDays: 0, bestStreak: 0, topicStats: {}, reviewQueue: [], theme: "dark", studyPlan: null, sessions: [] } })
  })

  it("reports a network/query failure as a Result instead of throwing", async () => {
    fromMock.mockImplementation((table: string) => {
      if (table === "user_progress") return queryBuilder({ data: null, error: { message: "network error" } })
      return queryBuilder({ data: [], error: null })
    })
    const { fetchCloudProgress } = await import("./progressSync")

    const result = await fetchCloudProgress("user-1")

    expect(result).toEqual({ ok: false, error: "network error" })
  })

  it("converts session_history rows back into SessionResult shape", async () => {
    const row = { id: "s1", user_id: "user-1", game_id: "python", difficulty: "beginner", started_at: 1, finished_at: 2, xp_earned: 10, attempts: [{ questionId: "q1" }] }
    fromMock.mockImplementation((table: string) => {
      if (table === "user_progress") return queryBuilder({ data: null, error: null })
      return queryBuilder({ data: [row], error: null })
    })
    const { fetchCloudProgress } = await import("./progressSync")

    const result = await fetchCloudProgress("user-1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.sessions).toEqual([{ id: "s1", gameId: "python", difficulty: "beginner", startedAt: 1, finishedAt: 2, xpEarned: 10, attempts: [{ questionId: "q1" }] }])
    }
  })
})

describe("pushCloudProgress", () => {
  const baseProgress = { xp: 10, sessions: [], unlockedAchievements: [], lastActiveDateKey: null, streakDays: 0, bestStreak: 0, topicStats: {}, reviewQueue: [], theme: "dark" as const, studyPlan: null }

  it("calls the stale-write-guarding RPC with the right payload and reports success", async () => {
    rpcMock.mockResolvedValue({ data: { client_updated_at: 500 }, error: null })
    const { pushCloudProgress } = await import("./progressSync")

    const result = await pushCloudProgress("user-1", baseProgress, 500)

    expect(result).toEqual({ ok: true, data: { appliedClientUpdatedAt: 500 } })
    expect(rpcMock).toHaveBeenCalledWith(
      "upsert_user_progress",
      expect.objectContaining({ p_xp: 10, p_client_updated_at: 500 }),
    )
  })

  it("reports a cloud sync failure without throwing, so local progress is never put at risk", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "fetch failed" } })
    const { pushCloudProgress } = await import("./progressSync")

    const result = await pushCloudProgress("user-1", baseProgress, 500)

    expect(result).toEqual({ ok: false, error: "fetch failed" })
  })

  it("upserts sessions with ignoreDuplicates so a retried push after a dropped connection is a safe no-op", async () => {
    const upsertSpy = vi.fn((_rows: unknown, _opts: unknown) => Promise.resolve({ data: null, error: null }))
    fromMock.mockImplementation(() => ({ upsert: upsertSpy }))
    rpcMock.mockResolvedValue({ data: { client_updated_at: 500 }, error: null })
    const { pushCloudProgress } = await import("./progressSync")

    const withSession = { ...baseProgress, sessions: [{ id: "s1", gameId: "python", difficulty: "beginner" as const, startedAt: 1, finishedAt: 2, xpEarned: 5, attempts: [] }] }
    await pushCloudProgress("user-1", withSession, 500)
    await pushCloudProgress("user-1", withSession, 600)

    expect(upsertSpy).toHaveBeenCalledTimes(2)
    for (const call of upsertSpy.mock.calls) {
      expect(call[1]).toEqual({ onConflict: "id", ignoreDuplicates: true })
    }
  })
})
