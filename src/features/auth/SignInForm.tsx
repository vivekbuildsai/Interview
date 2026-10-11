import { useState } from "react"
import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAuthStore } from "@/lib/auth/authStore"

export function SignInForm({ onSwitchToSignUp, onSwitchToReset, onSuccess }: { onSwitchToSignUp: () => void; onSwitchToReset: () => void; onSuccess: () => void }) {
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await signInWithEmail(email, password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="w-full">
        <LogIn className="size-4" /> {submitting ? "Signing in..." : "Sign in"}
      </Button>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <button type="button" onClick={onSwitchToReset} className="focus-ring rounded hover:text-zinc-200">
          Forgot password?
        </button>
        <button type="button" onClick={onSwitchToSignUp} className="focus-ring rounded hover:text-zinc-200">
          Need an account? Sign up
        </button>
      </div>
    </form>
  )
}
