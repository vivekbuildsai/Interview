// Shows the welcome/entry screen exactly once, on a true first visit --
// never again after a choice is made, never for an existing user who
// already has local progress (they implicitly already chose "guest" by
// using the app before this feature existed), never mid-session, and
// never as something that blocks the dashboard from rendering underneath
// it (it's a dismissible overlay, not a route gate).

import { useEffect, useState } from "react"
import { AuthModal } from "./AuthModal"
import { useAuthStore } from "@/lib/auth/authStore"
import { useArenaStore } from "@/lib/store"

export function WelcomeGate() {
  const status = useAuthStore((s) => s.status)
  const hasMadeEntryChoice = useAuthStore((s) => s.hasMadeEntryChoice)
  const recordGuestChoice = useAuthStore((s) => s.recordGuestChoice)
  const hasExistingProgress = useArenaStore((s) => s.progress.sessions.length > 0)
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (checked || status === "loading") return
    setChecked(true)
    if (status === "authenticated") return
    if (hasMadeEntryChoice() || hasExistingProgress) {
      // Backfill silently so this check is O(1) on every future load.
      recordGuestChoice()
      return
    }
    setOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally runs once auth status first resolves, not on every render.
  }, [status])

  return <AuthModal open={open} onClose={() => setOpen(false)} initialView="welcome" />
}
