import { useState } from "react"
import { Mail, MailCheck, User } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { GoogleButton } from "./GoogleButton"
import { SignInForm } from "./SignInForm"
import { SignUpForm } from "./SignUpForm"
import { PasswordResetForm } from "./PasswordResetForm"
import { useAuthStore } from "@/lib/auth/authStore"
import { isSupabaseConfigured } from "@/lib/supabase/client"

type View = "welcome" | "sign-in" | "sign-up" | "reset" | "check-email" | "reset-sent"

const TITLES: Record<View, string> = {
  welcome: "Welcome to Interview Arena",
  "sign-in": "Sign in",
  "sign-up": "Create your account",
  reset: "Reset your password",
  "check-email": "Check your inbox",
  "reset-sent": "Check your inbox",
}

export function AuthModal({ open, onClose, initialView = "welcome" }: { open: boolean; onClose: () => void; initialView?: View }) {
  const [view, setView] = useState<View>(initialView)
  const [pendingEmail, setPendingEmail] = useState("")
  const [googleError, setGoogleError] = useState<string | null>(null)
  const recordGuestChoice = useAuthStore((s) => s.recordGuestChoice)
  const configured = isSupabaseConfigured()

  function handleClose() {
    recordGuestChoice()
    onClose()
    // Reset for next time the modal opens, after the close animation.
    setTimeout(() => setView(initialView), 200)
  }

  function continueAsGuest() {
    recordGuestChoice()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={TITLES[view]}>
      {!configured && view !== "welcome" && (
        <div className="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning">Cloud accounts aren't configured for this deployment yet -- guest play still works normally.</div>
      )}

      {view === "welcome" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-400">Play instantly as a guest, or sign in to save your progress to the cloud and pick it up on any device.</p>
          <Button variant="secondary" className="w-full" onClick={continueAsGuest}>
            <User className="size-4" /> Continue as Guest
          </Button>
          {configured && (
            <>
              <GoogleButton onError={setGoogleError} />
              {googleError && (
                <p role="alert" className="text-xs text-danger">
                  {googleError}
                </p>
              )}
              <Button variant="outline" className="w-full" onClick={() => setView("sign-up")}>
                <Mail className="size-4" /> Sign up or sign in with email
              </Button>
            </>
          )}
          <p className="text-center text-xs text-zinc-500">Guest progress stays on this browser and device only, until you create an account.</p>
        </div>
      )}

      {view === "sign-in" && <SignInForm onSwitchToSignUp={() => setView("sign-up")} onSwitchToReset={() => setView("reset")} onSuccess={onClose} />}

      {view === "sign-up" && <SignUpForm onSwitchToSignIn={() => setView("sign-in")} onVerificationSent={(email) => { setPendingEmail(email); setView("check-email") }} />}

      {view === "reset" && <PasswordResetForm onBackToSignIn={() => setView("sign-in")} onSent={(email) => { setPendingEmail(email); setView("reset-sent") }} />}

      {(view === "check-email" || view === "reset-sent") && (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <MailCheck className="size-10 text-accent-violetSoft" />
          <p className="text-sm text-zinc-300">
            {view === "check-email" ? "We've sent a verification link to" : "We've sent a password reset link to"} <span className="font-medium text-zinc-100">{pendingEmail}</span>.
          </p>
          <Button variant="ghost" onClick={() => setView("sign-in")}>
            Back to sign in
          </Button>
        </div>
      )}
    </Modal>
  )
}
