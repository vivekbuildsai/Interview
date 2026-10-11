import { useMemo, useState, type ReactNode } from "react"
import { Navigate, useParams } from "react-router-dom"
import { motion } from "framer-motion"
import { CheckCircle2, PartyPopper, RotateCcw, Trophy, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { LinkButton } from "@/components/ui/Button"
import { Button } from "@/components/ui/Button"
import { ProgressRing } from "@/components/ui/ProgressRing"
import { Icon } from "@/components/ui/Icon"
import { Modal } from "@/components/ui/Modal"
import { useArenaStore } from "@/lib/store"
import { accuracyPct } from "@/lib/scoring"
import { findQuestion, getGame } from "@/lib/gameRegistry"
import { ACHIEVEMENTS } from "@/lib/achievements"
import { DIFFICULTY_META, type Difficulty } from "@/lib/types"

export default function ResultsPage() {
  const { gameId, difficulty } = useParams<{ gameId: string; difficulty: Difficulty }>()
  const lastSessionResult = useArenaStore((s) => s.lastSessionResult)
  const clearLastUnlocks = useArenaStore((s) => s.clearLastUnlocks)
  // Snapshotted once at mount -- the store's lastUnlockedAchievements is
  // cleared when the celebration modal is dismissed, so this page must
  // hold its own copy rather than reading the (soon-to-be-cleared) live
  // store value on every render.
  const [unlockedSnapshot] = useState(() => useArenaStore.getState().lastUnlockedAchievements)
  const [celebrationOpen, setCelebrationOpen] = useState(unlockedSnapshot.length > 0)

  function dismissCelebration() {
    setCelebrationOpen(false)
    clearLastUnlocks()
  }

  const game = gameId ? getGame(gameId) : undefined

  const topicBreakdown = useMemo(() => {
    if (!lastSessionResult) return []
    const map = new Map<string, { correct: number; total: number }>()
    for (const a of lastSessionResult.attempts) {
      const entry = map.get(a.topic) ?? { correct: 0, total: 0 }
      entry.total += 1
      if (a.correct) entry.correct += 1
      map.set(a.topic, entry)
    }
    return Array.from(map.entries()).map(([topic, v]) => ({ topic, ...v, pct: Math.round((v.correct / v.total) * 100) }))
  }, [lastSessionResult])

  if (!lastSessionResult || !game || !difficulty) {
    return <Navigate to={gameId ? `/play/${gameId}` : "/library"} replace />
  }

  const accuracy = accuracyPct(lastSessionResult.attempts)
  const correct = lastSessionResult.attempts.filter((a) => a.correct).length
  const incorrect = lastSessionResult.attempts.filter((a) => !a.correct && !a.skipped)
  const totalTimeSec = Math.round((lastSessionResult.finishedAt - lastSessionResult.startedAt) / 1000)
  const meta = DIFFICULTY_META[difficulty]

  return (
    <div className="bg-arena min-h-screen">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <ProgressRing value={accuracy} size={96} strokeWidth={8} label={<span className="text-xl font-bold">{accuracy}%</span>} />
            <div>
              <h1 className="text-2xl font-bold text-zinc-50">Session complete</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {game.name} &middot; {meta.label}
              </p>
            </div>
            <Badge tone="violet" className="text-sm">
              +{lastSessionResult.xpEarned} XP earned
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatBlock icon={<CheckCircle2 className="size-5 text-success" />} value={correct} label="Correct" />
            <StatBlock icon={<XCircle className="size-5 text-danger" />} value={incorrect.length} label="Incorrect" />
            <StatBlock icon={<Trophy className="size-5 text-accent-violetSoft" />} value={`${Math.floor(totalTimeSec / 60)}m ${totalTimeSec % 60}s`} label="Time taken" />
          </div>

          {topicBreakdown.length > 0 && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-5">
                <p className="text-sm font-semibold text-zinc-200">Topic performance</p>
                {topicBreakdown.map((t) => (
                  <div key={t.topic} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-zinc-300">{t.topic}</span>
                    <span className={`text-sm font-medium ${t.pct >= 70 ? "text-success" : "text-warning"}`}>
                      {t.correct}/{t.total} ({t.pct}%)
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {incorrect.length > 0 && (
            <Card>
              <CardContent className="flex flex-col gap-3 p-5">
                <p className="text-sm font-semibold text-zinc-200">Worth revisiting</p>
                {incorrect.map((a) => {
                  const q = findQuestion(a.questionId)
                  return (
                    <div key={a.questionId} className="rounded-lg border border-base-400 bg-base-200/50 p-3">
                      <p className="text-sm text-zinc-300">{q?.prompt.slice(0, 140)}{(q?.prompt.length ?? 0) > 140 ? "..." : ""}</p>
                      <p className="mt-1.5 text-xs text-zinc-500">{q?.explanation}</p>
                    </div>
                  )
                })}
                <p className="text-xs text-zinc-500">These have been added to your Review Queue -- find them anytime on the Progress page.</p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <LinkButton variant="secondary" to={`/arena/${game.id}/${difficulty}`}>
              <RotateCcw className="size-4" /> Retry this level
            </LinkButton>
            <LinkButton to="/">Continue learning</LinkButton>
            <LinkButton variant="ghost" to="/library">
              Back to library
            </LinkButton>
          </div>
        </motion.div>
      </main>

      <Modal open={celebrationOpen} onClose={dismissCelebration} title="Achievement unlocked!">
        <div className="flex flex-col gap-3">
          {unlockedSnapshot.map((id) => {
            const a = ACHIEVEMENTS.find((a) => a.id === id)
            if (!a) return null
            return (
              <div key={id} className="flex items-center gap-3 rounded-xl border border-accent-violet/30 bg-accent-violet/10 p-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-violet to-accent-cyan">
                  <Icon name={a.icon} className="size-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-50">{a.title}</p>
                  <p className="text-xs text-zinc-400">{a.description}</p>
                </div>
              </div>
            )
          })}
          <Button className="mt-1" onClick={dismissCelebration}>
            <PartyPopper className="size-4" /> Nice!
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function StatBlock({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-1.5 p-4 text-center">
        {icon}
        <p className="text-lg font-bold text-zinc-50">{value}</p>
        <p className="text-xs text-zinc-400">{label}</p>
      </CardContent>
    </Card>
  )
}
