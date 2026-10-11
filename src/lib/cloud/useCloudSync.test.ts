import { renderHook, waitFor } from "@testing-library/react"
import { act } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchCloudProgress = vi.fn()
const pushCloudProgress = vi.fn()

vi.mock("./progressSync", () => ({ fetchCloudProgress: (...a: unknown[]) => fetchCloudProgress(...a), pushCloudProgress: (...a: unknown[]) => pushCloudProgress(...a) }))

async function freshImports() {
  vi.resetModules()
  const { useCloudSync } = await import("./useCloudSync")
  const { useAuthStore } = await import("@/lib/auth/authStore")
  const { useArenaStore } = await import("@/lib/store")
  const { useSyncStore } = await import("./syncStore")
  return { useCloudSync, useAuthStore, useArenaStore, useSyncStore }
}

const emptyCloud = { xp: 0, unlockedAchievements: [], lastActiveDateKey: null, streakDays: 0, bestStreak: 0, topicStats: {}, reviewQueue: [], theme: "dark" as const, sessions: [] }

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
})

describe("useCloudSync", () => {
  it("does nothing for a guest -- no cloud reads or writes at all", async () => {
    const { useCloudSync, useAuthStore } = await freshImports()
    useAuthStore.setState({ status: "guest", user: null })

    renderHook(() => useCloudSync())
    await act(async () => {
      await Promise.resolve()
    })

    expect(fetchCloudProgress).not.toHaveBeenCalled()
    expect(pushCloudProgress).not.toHaveBeenCalled()
  })

  it("on sign-in, fetches cloud, merges with local, pushes the merge, and adopts it locally", async () => {
    const { useCloudSync, useAuthStore, useArenaStore, useSyncStore } = await freshImports()
    useArenaStore.getState().resetProgress()
    useArenaStore.setState((s) => ({
      progress: { ...s.progress, xp: 10, sessions: [{ id: "local1", gameId: "python", difficulty: "beginner", startedAt: 0, finishedAt: 100, xpEarned: 10, attempts: [] }] },
    }))
    fetchCloudProgress.mockResolvedValue({ ok: true, data: { ...emptyCloud, xp: 20, sessions: [{ id: "cloud1", gameId: "python", difficulty: "beginner", startedAt: 0, finishedAt: 200, xpEarned: 20, attempts: [] }] } })
    pushCloudProgress.mockResolvedValue({ ok: true, data: { appliedClientUpdatedAt: Date.now() } })

    renderHook(() => useCloudSync())
    await act(async () => {
      useAuthStore.setState({ status: "authenticated", user: { id: "user-1" } as never })
      await Promise.resolve()
    })

    await waitFor(() => expect(pushCloudProgress).toHaveBeenCalledTimes(1))

    const merged = useArenaStore.getState().progress
    expect(merged.xp).toBe(30)
    expect(merged.sessions.map((s) => s.id).sort()).toEqual(["cloud1", "local1"])
    expect(useSyncStore.getState().status).toBe("synced")
  })

  it("never re-runs reconcile a second time for the same already-reconciled user", async () => {
    const { useCloudSync, useAuthStore } = await freshImports()
    fetchCloudProgress.mockResolvedValue({ ok: true, data: emptyCloud })
    pushCloudProgress.mockResolvedValue({ ok: true, data: { appliedClientUpdatedAt: Date.now() } })

    const { rerender } = renderHook(() => useCloudSync())
    await act(async () => {
      useAuthStore.setState({ status: "authenticated", user: { id: "user-1" } as never })
      await Promise.resolve()
    })
    await waitFor(() => expect(fetchCloudProgress).toHaveBeenCalledTimes(1))

    rerender()
    rerender()
    await act(async () => {
      await Promise.resolve()
    })

    expect(fetchCloudProgress).toHaveBeenCalledTimes(1)
  })

  it("leaves local progress untouched and reports an error status when the cloud fetch fails (network failure doesn't corrupt local state)", async () => {
    const { useCloudSync, useAuthStore, useArenaStore, useSyncStore } = await freshImports()
    useArenaStore.getState().resetProgress()
    useArenaStore.setState((s) => ({ progress: { ...s.progress, xp: 42 } }))
    fetchCloudProgress.mockResolvedValue({ ok: false, error: "network error" })

    renderHook(() => useCloudSync())
    await act(async () => {
      useAuthStore.setState({ status: "authenticated", user: { id: "user-1" } as never })
      await Promise.resolve()
    })

    await waitFor(() => expect(useSyncStore.getState().status).toBe("error"))
    expect(useArenaStore.getState().progress.xp).toBe(42)
    expect(pushCloudProgress).not.toHaveBeenCalled()
  })

  it("retrying after a failure (e.g. the user reconnects) is safe to repeat -- re-authenticating runs reconcile again for a fresh session", async () => {
    const { useCloudSync, useAuthStore, useSyncStore } = await freshImports()
    fetchCloudProgress.mockResolvedValueOnce({ ok: false, error: "network error" })
    renderHook(() => useCloudSync())

    await act(async () => {
      useAuthStore.setState({ status: "authenticated", user: { id: "user-1" } as never })
      await Promise.resolve()
    })
    await waitFor(() => expect(useSyncStore.getState().status).toBe("error"))

    fetchCloudProgress.mockResolvedValueOnce({ ok: true, data: emptyCloud })
    pushCloudProgress.mockResolvedValue({ ok: true, data: { appliedClientUpdatedAt: Date.now() } })
    await act(async () => {
      useAuthStore.setState({ status: "guest", user: null })
      await Promise.resolve()
    })
    await act(async () => {
      useAuthStore.setState({ status: "authenticated", user: { id: "user-1" } as never })
      await Promise.resolve()
    })

    await waitFor(() => expect(fetchCloudProgress).toHaveBeenCalledTimes(2))
  })
})
