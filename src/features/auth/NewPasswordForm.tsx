import { useState } from "react"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAuthStore } from "@/lib/auth/authStore"

const MIN_PASSWORD_LENGTH = 8

export function NewPasswordForm({ onDone }: { onDone: () => void }) {
  const updatePassword = useAuthStore((s) => s.updatePassword)
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
    const result = await updatePassword(password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-zinc-400">Choose a new password for your account.</p>
      <Input label="New password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="w-full">
        <KeyRound className="size-4" /> {submitting ? "Saving..." : "Save new password"}
      </Button>
    </form>
  )
}
