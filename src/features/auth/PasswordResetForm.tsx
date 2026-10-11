import { useState } from "react"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAuthStore } from "@/lib/auth/authStore"

export function PasswordResetForm({ onBackToSignIn, onSent }: { onBackToSignIn: () => void; onSent: (email: string) => void }) {
  const sendPasswordReset = useAuthStore((s) => s.sendPasswordReset)
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await sendPasswordReset(email)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSent(email)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">Enter your account's email and we'll send a link to reset your password.</p>
      <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="w-full">
        <KeyRound className="size-4" /> {submitting ? "Sending..." : "Send reset link"}
      </Button>
      <button type="button" onClick={onBackToSignIn} className="focus-ring self-center rounded text-xs text-zinc-400 hover:text-zinc-200">
        Back to sign in
      </button>
    </form>
  )
}
