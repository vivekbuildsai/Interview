// Authentication state. Deliberately a separate store from useArenaStore
// (src/lib/store.ts) -- "who is signed in" and "what progress exists" are
// different concerns, and keeping them apart means the game engine, the
// dashboard, and every existing test that only cares about progress never
// need to know this store exists.
//
// Supabase's own client already persists the session token to
// localStorage and restores it on load (persistSession: true in
// src/lib/supabase/client.ts) -- this store doesn't duplicate that, it
// just mirrors the current session into React-visible state via
// supabase.auth.onAuthStateChange.

import { create } from "zustand"
import type { Session, User } from "@supabase/supabase-js"
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client"
import { persistentStore } from "@/lib/storage"

export type AuthStatus = "loading" | "guest" | "authenticated"

const ENTRY_CHOICE_KEY = "interview-arena-entry-choice"
const RETURN_PATH_KEY = "interview-arena-auth-return-path"

// Any flow that navigates away and back (Google OAuth, an emailed
// verification/reset link) loses in-memory React state entirely -- the
// intended destination has to survive that round trip via storage, not a
// closure. sessionStorage (not localStorage) because it shouldn't leak
// into an unrelated future session on the same device.
function rememberReturnPath() {
  try {
    sessionStorage.setItem(RETURN_PATH_KEY, window.location.pathname)
  } catch {
    // Best-effort -- AuthCallbackPage falls back to "/" if unavailable.
  }
}

export function consumeRememberedReturnPath(): string {
  try {
    const path = sessionStorage.getItem(RETURN_PATH_KEY)
    sessionStorage.removeItem(RETURN_PATH_KEY)
    return path && path.startsWith("/") ? path : "/"
  } catch {
    return "/"
  }
}

export type AuthActionResult = { ok: true } | { ok: false; error: string }

interface AuthState {
  status: AuthStatus
  user: User | null
  session: Session | null
  // True while the user has clicked a password-recovery email link and
  // has a temporary recovery session, but hasn't set a new password yet
  // -- AuthCallbackPage uses this to show NewPasswordForm instead of just
  // redirecting straight back into the app.
  recoveryPending: boolean

  hasMadeEntryChoice: () => boolean
  recordGuestChoice: () => void
  clearRecoveryPending: () => void

  initAuth: () => void
  signUpWithEmail: (email: string, password: string) => Promise<AuthActionResult>
  signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>
  signInWithGoogle: (redirectTo?: string) => Promise<AuthActionResult>
  signOut: () => Promise<AuthActionResult>
  sendPasswordReset: (email: string, redirectTo?: string) => Promise<AuthActionResult>
  updatePassword: (newPassword: string) => Promise<AuthActionResult>
}

function describeAuthError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message
  }
  return "Something went wrong. Check your connection and try again."
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: isSupabaseConfigured() ? "loading" : "guest",
  user: null,
  session: null,
  recoveryPending: false,

  hasMadeEntryChoice: () => persistentStore.getItem(ENTRY_CHOICE_KEY) !== null,
  recordGuestChoice: () => persistentStore.setItem(ENTRY_CHOICE_KEY, "guest"),
  clearRecoveryPending: () => set({ recoveryPending: false }),

  initAuth: () => {
    if (!supabase) {
      set({ status: "guest" })
      return
    }

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        set({ recoveryPending: true })
      }
      if (session?.user) {
        set({ status: "authenticated", user: session.user, session })
      } else {
        set({ status: "guest", user: null, session: null })
      }
    })

    // onAuthStateChange fires once immediately with the restored session
    // (or null) on subscribe, so no separate getSession() call is needed
    // to leave "loading" -- but guard with a short fallback in case it
    // never fires (e.g. a network issue reaching Supabase).
    window.setTimeout(() => {
      if (get().status === "loading") set({ status: "guest" })
    }, 4000)
  },

  signUpWithEmail: async (email, password) => {
    if (!supabase) return { ok: false, error: "Cloud accounts aren't configured for this deployment yet." }
    rememberReturnPath()
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    if (error) return { ok: false, error: describeAuthError(error) }
    return { ok: true }
  },

  signInWithEmail: async (email, password) => {
    if (!supabase) return { ok: false, error: "Cloud accounts aren't configured for this deployment yet." }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: describeAuthError(error) }
    return { ok: true }
  },

  signInWithGoogle: async (redirectTo) => {
    if (!supabase) return { ok: false, error: "Cloud accounts aren't configured for this deployment yet." }
    rememberReturnPath()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo ?? `${window.location.origin}/auth/callback` },
    })
    if (error) return { ok: false, error: describeAuthError(error) }
    return { ok: true }
  },

  signOut: async () => {
    if (!supabase) return { ok: true }
    const { error } = await supabase.auth.signOut()
    if (error) return { ok: false, error: describeAuthError(error) }
    return { ok: true }
  },

  sendPasswordReset: async (email, redirectTo) => {
    if (!supabase) return { ok: false, error: "Cloud accounts aren't configured for this deployment yet." }
    rememberReturnPath()
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo ?? `${window.location.origin}/auth/callback` })
    if (error) return { ok: false, error: describeAuthError(error) }
    return { ok: true }
  },

  updatePassword: async (newPassword) => {
    if (!supabase) return { ok: false, error: "Cloud accounts aren't configured for this deployment yet." }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { ok: false, error: describeAuthError(error) }
    return { ok: true }
  },
}))
