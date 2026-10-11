import { useState } from "react"
import { CalendarRange, CheckCircle2, RotateCcw, SkipForward } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button, LinkButton } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/cn"
import { useArenaStore } from "@/lib/store"
import { getPlayableGames } from "@/lib/gameRegistry"
import { DIFFICULTY_META, type StudyPlan } from "@/lib/types"
import { generateStudyPlan, nextDueDay, planProgress, STUDY_PLAN_HORIZONS, type StudyPlanHorizon } from "@/lib/studyPlan"
import { todayKey } from "@/lib/id"

const MINUTE_OPTIONS = [15, 30, 45, 60]

export default function StudyPlanPage() {
  const progress = useArenaStore((s) => s.progress)
  const setStudyPlan = useArenaStore((s) => s.setStudyPlan)
  const markStudyPlanDay = useArenaStore((s) => s.markStudyPlanDay)

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Study Plan</h1>
        <p className="mt-1 text-sm text-zinc-400">A day-by-day schedule built from your own practice history -- missing a day never resets it.</p>
      </div>

      {progress.studyPlan ? (
        <PlanView plan={progress.studyPlan} onMarkDay={markStudyPlanDay} onRegenerate={() => setStudyPlan(null)} />
      ) : (
        <PlanGenerator onGenerate={(plan) => setStudyPlan(plan)} />
      )}
    </div>
  )
}

function PlanGenerator({ onGenerate }: { onGenerate: (plan: StudyPlan) => void }) {
  const progress = useArenaStore((s) => s.progress)
  const [horizon, setHorizon] = useState<StudyPlanHorizon>(14)
  const [dailyMinutes, setDailyMinutes] = useState(30)
  const [domains, setDomains] = useState<string[]>([])

  const games = getPlayableGames().filter((g) => g.questions.length > 0)

  function toggleDomain(id: string) {
    setDomains((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Build your plan</CardTitle>
        <CardDescription>Choose a horizon and how much time you have each day. We'll mix in revision for your weaker topics automatically.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">How many days?</p>
          <div className="flex gap-2">
            {STUDY_PLAN_HORIZONS.map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={cn("focus-ring rounded-lg border px-4 py-2 text-sm", horizon === h ? "border-accent-violet bg-accent-violet/10 text-zinc-50" : "border-base-400 bg-base-200/50 text-zinc-300")}
              >
                {h} days
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">Daily time budget</p>
          <div className="flex gap-2">
            {MINUTE_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setDailyMinutes(m)}
                className={cn("focus-ring rounded-lg border px-4 py-2 text-sm", dailyMinutes === m ? "border-accent-violet bg-accent-violet/10 text-zinc-50" : "border-base-400 bg-base-200/50 text-zinc-300")}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-zinc-300">Domains (optional -- leave empty to draw from everything, prioritizing your weak topics)</p>
          <div className="flex flex-wrap gap-2">
            {games.map((g) => (
              <button
                key={g.id}
                onClick={() => toggleDomain(g.id)}
                className={cn(
                  "focus-ring flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                  domains.includes(g.id) ? "border-accent-violet bg-accent-violet/10 text-zinc-50" : "border-base-400 bg-base-200/50 text-zinc-300",
                )}
              >
                <Icon name={g.icon} className="size-3.5" />
                {g.name}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-fit"
          onClick={() => onGenerate(generateStudyPlan(progress.sessions, progress.reviewQueue, { horizonDays: horizon, dailyMinutes, domains: domains.length > 0 ? domains : undefined }))}
        >
          <CalendarRange className="size-4" /> Generate plan
        </Button>
      </CardContent>
    </Card>
  )
}

function PlanView({
  plan,
  onMarkDay,
  onRegenerate,
}: {
  plan: StudyPlan
  onMarkDay: (dayIndex: number, status: "completed" | "skipped" | "pending") => void
  onRegenerate: () => void
}) {
  const progressSummary = planProgress(plan)
  const due = nextDueDay(plan)
  const today = todayKey()

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="text-sm text-zinc-300">
            <span className="font-semibold text-zinc-50">
              {progressSummary.completed}/{progressSummary.total}
            </span>{" "}
            days completed &middot; {plan.dailyMinutes} min/day &middot; {plan.horizonDays}-day plan
          </div>
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            <RotateCcw className="size-4" /> Regenerate
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {plan.days.map((day) => {
          const isDue = due?.dayIndex === day.dayIndex
          const isPast = day.dateKey < today && day.status === "pending"
          return (
            <Card key={day.dayIndex} className={cn(isDue && "border-accent-violet/50 bg-accent-violet/5")}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-base-300">
                    {day.status === "completed" ? <CheckCircle2 className="size-4 text-success" /> : <CalendarRange className="size-4 text-accent-violetSoft" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {day.gameName} &middot; {DIFFICULTY_META[day.difficulty].label}
                      {day.isRevision && (
                        <Badge tone="warning" className="ml-2">
                          Revision
                        </Badge>
                      )}
                      {isPast && day.status === "pending" && (
                        <Badge tone="neutral" className="ml-2">
                          Catch up
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {day.dateKey} &middot; ~{day.estimatedMinutes} min{day.topic ? ` · ${day.topic}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {day.status === "pending" ? (
                    <>
                      <LinkButton size="sm" to={`/arena/${day.gameId}/${day.difficulty}`}>
                        Start
                      </LinkButton>
                      <Button variant="ghost" size="sm" onClick={() => onMarkDay(day.dayIndex, "skipped")} title="Skip this day">
                        <SkipForward className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => onMarkDay(day.dayIndex, "pending")}>
                      {day.status === "completed" ? "Completed -- undo" : "Skipped -- undo"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
