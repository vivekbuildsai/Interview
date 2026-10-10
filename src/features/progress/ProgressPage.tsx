import type { ReactNode } from "react"
import { Flame, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Icon } from "@/components/ui/Icon"
import { ProgressRing } from "@/components/ui/ProgressRing"
import { EmptyState } from "@/components/ui/EmptyState"
import { LinkButton } from "@/components/ui/Button"
import { useArenaStore } from "@/lib/store"
import { overallStats } from "@/lib/derived"
import { ACHIEVEMENTS } from "@/lib/achievements"
import { findQuestion, getGame } from "@/lib/gameRegistry"
import { DIFFICULTY_META } from "@/lib/types"
import { cn } from "@/lib/cn"

export default function ProgressPage() {
  const progress = useArenaStore((s) => s.progress)
  const stats = overallStats(progress)

  const topicEntries = Object.entries(progress.topicStats)
    .filter(([, v]) => v.attempts > 0)
    .map(([topic, v]) => ({ topic, pct: Math.round((v.correct / v.attempts) * 100), attempts: v.attempts }))
    .sort((a, b) => b.attempts - a.attempts)

  const reviewQuestions = progress.reviewQueue.map((id) => findQuestion(id)).filter(Boolean)

  if (progress.sessions.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Progress</h1>
        <EmptyState icon="TrendingUp" title="Nothing tracked yet" description="Play your first session and your XP, streaks, and topic mastery will show up here -- based on real activity only." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Progress</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <ProgressRing value={stats.progressPct} size={72} label={<span className="text-base font-bold">Lv.{stats.level}</span>} />
            <div>
              <p className="text-sm text-zinc-400">
                {stats.xpIntoLevel} / {stats.xpForNextLevel} XP to Level {stats.level + 1}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {stats.totalCorrect} correct out of {stats.totalAttempts} answered ({stats.accuracy}% accuracy)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
              <Flame className="size-8 fill-orange-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-zinc-50">{progress.streakDays}-day streak</p>
              <p className="text-xs text-zinc-500">Best streak: {progress.bestStreak} days &middot; {stats.totalSessions} sessions played</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {reviewQuestions.length > 0 && (
        <Section title="Review Queue" description="Questions you missed -- worth another attempt.">
          <div className="flex flex-col gap-2">
            {reviewQuestions.map((q) => {
              if (!q) return null
              const game = getGame(q.gameId)
              return (
                <Card key={q.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-200">{q.prompt.slice(0, 90)}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {game?.name} &middot; {DIFFICULTY_META[q.difficulty].label}
                      </p>
                    </div>
                    <LinkButton size="sm" variant="secondary" to={`/arena/${q.gameId}/${q.difficulty}`} className="shrink-0">
                      Practice
                    </LinkButton>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </Section>
      )}

      {topicEntries.length > 0 && (
        <Section title="Topic mastery">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {topicEntries.map((t) => (
              <div key={t.topic} className="flex items-center justify-between gap-3 rounded-lg border border-base-400 bg-base-200/50 px-3 py-2.5">
                <span className="text-sm text-zinc-300">{t.topic}</span>
                <span className={cn("text-sm font-semibold", t.pct >= 80 ? "text-success" : t.pct >= 50 ? "text-warning" : "text-danger")}>{t.pct}%</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Achievements" description={`${progress.unlockedAchievements.length} of ${ACHIEVEMENTS.length} unlocked`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = progress.unlockedAchievements.includes(a.id)
            return (
              <Card key={a.id} className={cn(!unlocked && "opacity-50")}>
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <div className={cn("flex size-12 items-center justify-center rounded-xl", unlocked ? "bg-gradient-to-br from-accent-violet to-accent-cyan" : "bg-base-300")}>
                    {unlocked ? <Icon name={a.icon} className="size-6 text-white" /> : <Lock className="size-5 text-zinc-500" />}
                  </div>
                  <p className="text-xs font-semibold text-zinc-200">{a.title}</p>
                  <p className="text-[11px] text-zinc-500">{a.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </Section>

      <Section title="Session history">
        <div className="flex flex-col gap-2">
          {[...progress.sessions]
            .sort((a, b) => b.finishedAt - a.finishedAt)
            .map((s) => {
              const game = getGame(s.gameId)
              const correct = s.attempts.filter((a) => a.correct).length
              return (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <Icon name={game?.icon ?? "Gamepad2"} className="size-4 text-accent-violetSoft" />
                      <div>
                        <p className="text-sm text-zinc-200">
                          {game?.name ?? s.gameId} &middot; {DIFFICULTY_META[s.difficulty].label}
                        </p>
                        <p className="text-xs text-zinc-500">{new Date(s.finishedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <Badge tone={correct === s.attempts.length ? "success" : "neutral"}>
                      {correct}/{s.attempts.length}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
        {description && <p className="text-xs text-zinc-500">{description}</p>}
      </div>
      {children}
    </div>
  )
}
