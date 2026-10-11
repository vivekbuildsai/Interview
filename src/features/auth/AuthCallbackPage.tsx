// Lands here after a Google OAuth redirect or an emailed
// verification/password-reset link. Supabase's client already parses the
// token out of the URL on load (detectSessionInUrl: true), so this page
// just waits for that to resolve via auth state, then either asks for a
// new password (password-recovery links) or sends the user back to
// wherever they were before they left (see consumeRememberedReturnPath).

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PageLoader } from "@/components/ui/PageLoader"
import { NewPasswordForm } from "./NewPasswordForm"
import { useAuthStore, consumeRememberedReturnPath } from "@/lib/auth/authStore"

export default function AuthCallbackPage() {
  const status = useAuthStore((s) => s.status)
  const recoveryPending = useAuthStore((s) => s.recoveryPending)
  const clearRecoveryPending = useAuthStore((s) => s.clearRecoveryPending)
  const navigate = useNavigate()

  useEffect(() => {
    if (status === "loading" || recoveryPending) return
    navigate(consumeRememberedReturnPath(), { replace: true })
  }, [status, recoveryPending, navigate])

  if (recoveryPending) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-xl font-bold text-zinc-50">Set a new password</h1>
        <div className="w-full rounded-2xl border border-base-400/70 bg-base-100/80 p-5">
          <NewPasswordForm
            onDone={() => {
              clearRecoveryPending()
              navigate(consumeRememberedReturnPath(), { replace: true })
            }}
          />
        </div>
      </div>
    )
  }

  return <PageLoader />
}
