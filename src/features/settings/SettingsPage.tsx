import { useState } from "react"
import { Cloud, LogOut, Moon, ShieldAlert, Sun, Trash2, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { useArenaStore } from "@/lib/store"
import { cn } from "@/lib/cn"
import { useAuthStore } from "@/lib/auth/authStore"
import { useSyncStore } from "@/lib/cloud/syncStore"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { AuthModal } from "@/features/auth/AuthModal"

export default function SettingsPage() {
  const theme = useArenaStore((s) => s.progress.theme)
  const toggleTheme = useArenaStore((s) => s.toggleTheme)
  const resetProgress = useArenaStore((s) => s.resetProgress)
  const sessionsCount = useArenaStore((s) => s.progress.sessions.length)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated")

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Settings</h1>

      <AccountCard />

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Dark mode is the default experience -- switch any time.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <button
            onClick={() => theme !== "dark" && toggleTheme()}
            className={cn("focus-ring flex flex-1 flex-col items-center gap-2 rounded-xl border p-4", theme === "dark" ? "border-accent-violet bg-accent-violet/10" : "border-base-400 bg-base-200/50")}
          >
            <Moon className="size-5 text-accent-violetSoft" />
            <span className="text-sm text-zinc-200">Dark</span>
          </button>
          <button
            onClick={() => theme !== "light" && toggleTheme()}
            className={cn("focus-ring flex flex-1 flex-col items-center gap-2 rounded-xl border p-4", theme === "light" ? "border-accent-violet bg-accent-violet/10" : "border-base-400 bg-base-200/50")}
          >
            <Sun className="size-5 text-accent-violetSoft" />
            <span className="text-sm text-zinc-200">Light</span>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data & privacy</CardTitle>
          <CardDescription>
            {isAuthenticated
              ? "Your progress syncs to your account and is also cached locally in this browser's storage."
              : "Everything is stored locally in this browser's storage -- no account, no server, no cross-device sync."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-zinc-400">
            You've completed <span className="font-semibold text-zinc-200">{sessionsCount}</span> session{sessionsCount === 1 ? "" : "s"}. Clearing your browser's site data for this app, or resetting below, will erase it permanently.
          </p>
          <Button variant="danger" className="w-fit" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" /> Reset all progress
          </Button>
        </CardContent>
      </Card>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Reset everything?">
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-3">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-danger" />
          <p className="text-sm text-zinc-300">This permanently deletes your XP, streaks, achievements, and session history. This cannot be undone.</p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              resetProgress()
              setConfirmOpen(false)
            }}
          >
            Reset progress
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function AccountCard() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const syncStatus = useSyncStore((s) => s.status)
  const syncError = useSyncStore((s) => s.lastError)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isSupabaseConfigured()) return null
  if (status === "loading") return null

  if (status === "authenticated" && user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="size-4 text-accent-violetSoft" /> Account
          </CardTitle>
          <CardDescription>Signed in as {user.email}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {syncStatus === "error" && syncError && <p className="text-sm text-danger">Cloud sync couldn't reach the server: {syncError}. Your progress is safe locally and will retry automatically.</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button
            variant="outline"
            className="w-fit"
            onClick={async () => {
              const result = await signOut()
              if (!result.ok) setError(result.error)
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="size-4 text-accent-violetSoft" /> Account
        </CardTitle>
        <CardDescription>You're playing as a guest. Your progress is on this browser and device only.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-zinc-400">Create a free account to save your XP, achievements, and history to the cloud and pick up where you left off on any device.</p>
        <Button className="w-fit" onClick={() => setAuthModalOpen(true)}>
          <Cloud className="size-4" /> Save your progress
        </Button>
      </CardContent>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} initialView="sign-up" />
    </Card>
  )
}
