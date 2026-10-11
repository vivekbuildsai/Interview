// A password-recovery link lands as a URL hash fragment
// (#access_token=...&type=recovery&...) on the bare site root -- confirmed
// live: Supabase's /auth/v1/verify redirect for this project drops the
// path portion of redirect_to entirely, so this never reaches a dedicated
// route. The Supabase client's own detectSessionInUrl processes that hash
// and fires a transient "PASSWORD_RECOVERY" event via onAuthStateChange --
// but the entire auth subsystem (authStore, the Supabase client itself) is
// lazy-loaded to keep @supabase/supabase-js out of the main bundle for
// guests (see src/App.tsx), and that lazy chunk can finish loading and
// subscribe to onAuthStateChange AFTER the client has already processed
// the hash and fired the event once -- a real race that was caught live
// (a recovery link silently signed the user in instead of prompting for a
// new password, see commit history for the deliberate reproduction).
//
// The fix: check for this synchronously, in main.tsx, which is the one
// module that's never lazy and always runs before anything else -- no
// race possible. The result is stashed so the lazy-loaded authStore can
// read a plain boolean instead of needing to win a timing race itself.

const STASH_KEY = "interview-arena-recovery-pending"

export function detectAndStashRecoveryLink(): void {
  try {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
    const params = new URLSearchParams(hash)
    if (params.get("type") === "recovery" && params.get("access_token")) {
      sessionStorage.setItem(STASH_KEY, "1")
    }
  } catch {
    // Best-effort -- worst case, a recovery link signs the user in
    // without prompting for a new password, same as before this fix.
  }
}

export function consumeStashedRecoveryFlag(): boolean {
  try {
    const value = sessionStorage.getItem(STASH_KEY) === "1"
    sessionStorage.removeItem(STASH_KEY)
    return value
  } catch {
    return false
  }
}
