// Wires auth state, the local arena store, and Supabase together. Mounted
// once at the app root (see src/app/Shell.tsx). Does nothing at all for a
// guest -- no subscription, no network call -- so guest mode stays exactly
// as it always was (Phase 3: never touch Supabase just because someone
// opened the homepage).
//
// Sync policy, deliberately simple over maximally efficient: every time
// auth status transitions into "authenticated" (a real sign-in, or an
// existing session restored on reload), run one reconcile pass --
// fetch cloud, merge with whatever's currently local (mergeProgress is
// safe to re-run on data that's already merged; see merge.ts), push the
// result, then adopt it locally. This is the same path for "brand new
// guest signing up," "guest signing into an existing account," and
// "already-linked device reloading the page," because the merge is
// idempotent by construction -- one policy, fewer edge cases. After that,
// local progress changes are pushed individually (debounced) rather than
// re-running the full merge every time.

import { useEffect, useRef } from "react"
import { useAuthStore } from "@/lib/auth/authStore"
import { useArenaStore } from "@/lib/store"
import { useSyncStore } from "./syncStore"
import { fetchCloudProgress, pushCloudProgress } from "./progressSync"
import { mergeProgress } from "./merge"

const PUSH_DEBOUNCE_MS = 1500

export function useCloudSync() {
  const status = useAuthStore((s) => s.status)
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const reconciledForUserId = useRef<string | null>(null)
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextPush = useRef(false)

  useEffect(() => {
    if (status !== "authenticated" || !userId) {
      reconciledForUserId.current = null
      return
    }
    if (reconciledForUserId.current === userId) return
    reconciledForUserId.current = userId
    const uid = userId

    let cancelled = false
    const sync = useSyncStore.getState()
    sync.setSyncing()

    async function reconcile() {
      const cloudResult = await fetchCloudProgress(uid)
      if (cancelled) return
      if (!cloudResult.ok) {
        sync.setError(cloudResult.error)
        return
      }

      const local = useArenaStore.getState().progress
      const merged = mergeProgress(local, cloudResult.data)

      const nothingNewLocally = merged.sessions.length === cloudResult.data.sessions.length && merged.xp === cloudResult.data.xp && merged.unlockedAchievements.length === cloudResult.data.unlockedAchievements.length

      skipNextPush.current = true
      useArenaStore.getState().setSyncedProgress(merged)

      if (nothingNewLocally) {
        if (cancelled) return
        sync.setSynced()
        return
      }

      const pushResult = await pushCloudProgress(uid, merged, Date.now())
      if (cancelled) return
      if (!pushResult.ok) {
        sync.setError(pushResult.error)
        return
      }
      sync.setSynced()
    }

    void reconcile()
    return () => {
      cancelled = true
    }
  }, [status, userId])

  useEffect(() => {
    if (status !== "authenticated" || !userId) return
    const uid = userId

    const unsubscribe = useArenaStore.subscribe((state, prevState) => {
      if (state.progress === prevState.progress) return
      if (skipNextPush.current) {
        skipNextPush.current = false
        return
      }

      if (pushTimer.current) clearTimeout(pushTimer.current)
      pushTimer.current = setTimeout(() => {
        void (async () => {
          const sync = useSyncStore.getState()
          sync.setSyncing()
          const progress = useArenaStore.getState().progress
          const result = await pushCloudProgress(uid, progress, Date.now())
          if (!result.ok) {
            sync.setError(result.error)
            return
          }
          sync.setSynced()
        })()
      }, PUSH_DEBOUNCE_MS)
    })

    return () => {
      unsubscribe()
      if (pushTimer.current) clearTimeout(pushTimer.current)
    }
  }, [status, userId])

  useEffect(() => {
    if (status !== "authenticated" || !userId) return
    const uid = userId
    function onOnline() {
      const sync = useSyncStore.getState()
      if (sync.status !== "error" && sync.status !== "offline") return
      void (async () => {
        sync.setSyncing()
        const progress = useArenaStore.getState().progress
        const result = await pushCloudProgress(uid, progress, Date.now())
        if (!result.ok) {
          sync.setError(result.error)
          return
        }
        sync.setSynced()
      })()
    }
    function onOffline() {
      useSyncStore.getState().setOffline()
    }
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
    }
  }, [status, userId])
}
