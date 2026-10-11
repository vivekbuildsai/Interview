import { useState } from "react"
import { Mail, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAuthStore } from "@/lib/auth/authStore"

const MIN_PASSWORD_LENGTH = 8

export function SignUpForm({ onSwitchToSignIn, onVerificationSent }: { onSwitchToSignIn: () => void; onVerificationSent: (email: string) => void }) {
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await signUpWithEmail(email, password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onVerificationSent(email)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-xl border border-base-400 bg-base-200/60 p-3 text-xs text-zinc-400">
        <Mail className="mt-0.5 size-4 shrink-0 text-accent-violetSoft" />
        We'll send a verification link to confirm your email before your account can sign in.
      </div>
      <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="Password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="w-full">
        <UserPlus className="size-4" /> {submitting ? "Creating account..." : "Create account"}
      </Button>
      <button type="button" onClick={onSwitchToSignIn} className="focus-ring self-center rounded text-xs text-zinc-400 hover:text-zinc-200">
        Already have an account? Sign in
      </button>
    </form>
  )
}
