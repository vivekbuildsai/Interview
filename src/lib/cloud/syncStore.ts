// Cloud-sync status, surfaced to the UI (account menu / settings). Kept
// separate from authStore and useArenaStore: this is purely "what is the
// sync machinery doing right now," not identity or game progress.

import { create } from "zustand"

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline"

interface SyncState {
  status: SyncStatus
  lastError: string | null
  lastSyncedAt: number | null
  setSyncing: () => void
  setSynced: () => void
  setError: (message: string) => void
  setOffline: () => void
  setIdle: () => void
}

export const useSyncStore = create<SyncState>()((set) => ({
  status: "idle",
  lastError: null,
  lastSyncedAt: null,
  setSyncing: () => set({ status: "syncing" }),
  setSynced: () => set({ status: "synced", lastError: null, lastSyncedAt: Date.now() }),
  setError: (message) => set({ status: "error", lastError: message }),
  setOffline: () => set({ status: "offline" }),
  setIdle: () => set({ status: "idle" }),
}))
