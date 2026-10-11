import { useState } from "react"
import { AlertTriangle, Check, LogOut, RefreshCw, User, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { AuthModal } from "./AuthModal"
import { useAuthStore } from "@/lib/auth/authStore"
import { useSyncStore } from "@/lib/cloud/syncStore"
import { isSupabaseConfigured } from "@/lib/supabase/client"

function SyncIndicator() {
  const status = useSyncStore((s) => s.status)
  if (status === "idle") return null
  if (status === "syncing") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
        <RefreshCw className="size-3 animate-spin" /> Syncing
      </span>
    )
  }
  if (status === "synced") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-success">
        <Check className="size-3" /> Synced
      </span>
    )
  }
  if (status === "offline") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
        <WifiOff className="size-3" /> Offline
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-danger">
      <AlertTriangle className="size-3" /> Sync failed
    </span>
  )
}

export function AccountMenu() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)

  if (!isSupabaseConfigured()) return null
  if (status === "loading") return null

  if (status === "authenticated" && user) {
    const initial = (user.email ?? "?").charAt(0).toUpperCase()
    return (
      <>
        <button onClick={() => setAccountOpen(true)} className="focus-ring flex items-center gap-2 rounded-full border border-base-400 bg-base-200/80 px-2 py-1 text-xs font-semibold text-zinc-200 hover:bg-base-300" aria-label="Account menu">
          <span className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-accent-violet to-accent-cyan text-[11px] text-white">{initial}</span>
          <SyncIndicator />
        </button>

        <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title="Your account">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-base-400 bg-base-200/60 p-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-accent-violet to-accent-cyan text-sm font-semibold text-white">{initial}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-100">{user.email}</span>
                <SyncIndicator />
              </div>
            </div>
            {signOutError && (
              <p role="alert" className="text-sm text-danger">
                {signOutError}
              </p>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                const result = await signOut()
                if (!result.ok) {
                  setSignOutError(result.error)
                  return
                }
                setAccountOpen(false)
              }}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <>
      <button onClick={() => setAuthModalOpen(true)} className="focus-ring flex items-center gap-2 rounded-full border border-base-400 bg-base-200/80 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-base-300 hover:text-white">
        <Badge tone="neutral" className="gap-1 border-none bg-transparent px-0 py-0 text-zinc-400">
          <User className="size-3" /> Guest
        </Badge>
        Sign in
      </button>
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} initialView="welcome" />
    </>
  )
}
