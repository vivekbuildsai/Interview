// Lands here after a query-param-based redirect (e.g. a PKCE-flow OAuth
// callback). Supabase's client already parses the token out of the URL
// on load (detectSessionInUrl: true), so this page just waits for that to
// resolve via auth state, then sends the user back to wherever they were
// before they left (see consumeRememberedReturnPath).
//
// Note: hash-based email links (signup verification, password recovery,
// magic links) don't actually reach this route at all -- confirmed live
// that this project's /auth/v1/verify redirect drops the path portion of
// redirect_to and lands on the bare site root with a #access_token=...
// fragment instead. RecoveryPrompt (mounted globally in AuthRoot, not
// here) is what actually handles the password-recovery case because of
// that; this page only needs to handle "wait, then go back."

import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { PageLoader } from "@/components/ui/PageLoader"
import { useAuthStore, consumeRememberedReturnPath } from "@/lib/auth/authStore"

export default function AuthCallbackPage() {
  const status = useAuthStore((s) => s.status)
  const navigate = useNavigate()

  useEffect(() => {
    if (status === "loading") return
    navigate(consumeRememberedReturnPath(), { replace: true })
  }, [status, navigate])

  return <PageLoader />
}
