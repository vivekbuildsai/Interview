// Persistence layer, deliberately kept behind a tiny interface so the
// backing store (localStorage today) can be swapped for IndexedDB or a
// real backend later without touching anything that calls it. Nothing
// above this file knows or cares where the bytes actually live.

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

class LocalStorageStore implements KeyValueStore {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  }
  setItem(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Storage can throw in private-browsing/quota-exceeded states --
      // progress just won't persist for that session rather than crashing.
    }
  }
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // see above
    }
  }
}

class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>()
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
}

function hasLocalStorage(): boolean {
  try {
    if (typeof window === "undefined") return false
    const testKey = "__arena_probe__"
    window.localStorage.setItem(testKey, "1")
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

export const persistentStore: KeyValueStore = hasLocalStorage() ? new LocalStorageStore() : new MemoryStore()
