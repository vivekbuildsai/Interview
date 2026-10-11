import { useState } from "react"
import { Sparkles, Send, AlertTriangle, LogIn } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { askCoach } from "@/lib/aiCoach"
import { useAuthStore } from "@/lib/auth/authStore"
import { isSupabaseConfigured } from "@/lib/supabase/client"

type Exchange = { question: string; answer: string }

export default function CoachPage() {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated")
  const [question, setQuestion] = useState("")
  const [history, setHistory] = useState<Exchange[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAsk() {
    const trimmed = question.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError(null)
    const result = await askCoach(trimmed)
    setLoading(false)
    if (result.ok) {
      setHistory((h) => [...h, { question: trimmed, answer: result.reply }])
      setQuestion("")
    } else if (result.reason === "not_configured") {
      setNotConfigured(true)
    } else {
      setError(result.message)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-50">
          <Sparkles className="size-6 text-accent-violetSoft" /> AI Interview Coach
        </h1>
        <p className="mt-1 text-sm text-zinc-400">Ask follow-up questions about anything you're studying. This is separate from, and never required for, the core practice modules.</p>
      </div>

      {notConfigured && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="text-sm text-zinc-300">
              <p className="font-medium text-zinc-100">The AI coach isn't set up on this deployment yet.</p>
              <p className="mt-1 text-zinc-400">This feature requires the site owner to configure an AI provider key. It has not been faked or simulated -- see AI_COACH_SETUP.md in the repository for the exact setup steps.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isSupabaseConfigured() ? (
        <Card>
          <CardContent className="p-5 text-sm text-zinc-400">Cloud accounts aren't configured on this deployment, so the AI coach (which requires sign-in) isn't available either. Everything else in the app still works as a guest.</CardContent>
        </Card>
      ) : !isAuthenticated ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="size-4 text-accent-violetSoft" /> Sign in required
            </CardTitle>
            <CardDescription>The coach is rate-limited per account to keep it available for everyone -- sign in from Settings to use it.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          {history.length > 0 && (
            <div className="flex flex-col gap-3">
              {history.map((exchange, i) => (
                <Card key={i}>
                  <CardContent className="flex flex-col gap-2 p-4">
                    <p className="text-sm font-medium text-zinc-200">{exchange.question}</p>
                    <p className="whitespace-pre-wrap text-sm text-zinc-400">{exchange.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex gap-2">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleAsk()
                }
              }}
              placeholder="Ask a follow-up question about a topic you're studying..."
              className="focus-ring min-h-[4.5rem] flex-1 resize-none rounded-lg border border-base-400 bg-base-200/50 p-3 text-sm text-zinc-100 placeholder:text-zinc-500"
              maxLength={2000}
            />
            <Button onClick={handleAsk} disabled={loading || question.trim().length === 0} className="h-fit">
              <Send className="size-4" /> {loading ? "Asking..." : "Ask"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
