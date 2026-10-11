import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { useAuthStore } from "@/lib/auth/authStore"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3.01h3.49c2.04-1.88 3.22-4.65 3.22-7.93z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.49-2.84c-.97.65-2.21 1.03-4.44 1.03-3.42 0-6.32-2.31-7.35-5.42H.9v3.4A11.98 11.98 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M4.65 14.86a7.15 7.15 0 0 1 0-4.53v-3.4H.9a11.98 11.98 0 0 0 0 11.33l3.75-3.4z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.78l3.1-3.03C17.94 1.58 15.23.5 12 .5A11.98 11.98 0 0 0 .9 6.93l3.75 3.4C5.68 7.06 8.58 4.75 12 4.75z" />
    </svg>
  )
}

export function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    const result = await signInWithGoogle()
    // On success, Supabase redirects the browser away to Google before
    // this ever resolves -- only a failure path actually reaches here.
    setSubmitting(false)
    if (!result.ok) onError(result.error)
  }

  return (
    <Button type="button" variant="secondary" className="w-full" disabled={submitting} onClick={handleClick}>
      <GoogleIcon /> {submitting ? "Redirecting..." : "Continue with Google"}
    </Button>
  )
}
