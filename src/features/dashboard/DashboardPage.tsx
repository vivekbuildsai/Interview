import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, CalendarRange, Flame, Sparkles, Target, TrendingUp, Trophy } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { LinkButton } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ProgressRing } from "@/components/ui/ProgressRing"
import { Icon } from "@/components/ui/Icon"
import { EmptyState } from "@/components/ui/EmptyState"
import { useArenaStore } from "@/lib/store"
import { overallStats, dailyChallenge } from "@/lib/derived"
import { getGame, getPlayableGames } from "@/lib/gameRegistry"
import { DIFFICULTY_META } from "@/lib/types"
import { GameCard } from "@/features/library/GameCard"
import { ACHIEVEMENTS } from "@/lib/achievements"
import { readinessEstimate, recommendNextChallenge, strongestTopics, weakestTopics, weeklyPracticeProgress } from "@/lib/recommendations"
import { nextDueDay } from "@/lib/studyPlan"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default function DashboardPage() {
  const progress = useArenaStore((s) => s.progress)
  const activeSession = useArenaStore((s) => s.activeSession)
  const stats = overallStats(progress)
  const isFirstTime = progress.sessions.length === 0
  const daily = dailyChallenge()
  const featuredGames = getPlayableGames()
    .filter((g) => g.questions.length > 0)
    .slice(0, 3)

  const readiness = readinessEstimate(progress)
  const strongest = strongestTopics(progress.sessions, 3)
  const weakest = weakestTopics(progress.sessions, 3)
  const nextChallenge = recommendNextChallenge(progress)
  const weeklyPractice = weeklyPracticeProgress(progress.sessions)
  const dueStudyDay = progress.studyPlan ? nextDueDay(progress.studyPlan) : null

  const activeGame = activeSession ? getGame(activeSession.gameId) : null
  const lastSession = stats.recentSessions[0]
  const continueGame = activeGame ?? (lastSession ? getGame(lastSession.gameId) : null)
  const continueDifficulty = activeSession?.difficulty ?? lastSession?.difficulty ?? "beginner"

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          {greeting()}
          {progress.sessions.length > 0 ? "," : ""} ready to train?
        </h1>
        <p className="mt-1 text-sm text-zinc-400 sm:text-base">
          {isFirstTime ? "Pick a game below and start from the fundamentals -- your progress will be tracked automatically." : `You're Level ${stats.level}, with a ${progress.streakDays}-day streak.`}
        </p>
      </div>

      {!isFirstTime && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<ProgressRing value={stats.progressPct} size={40} strokeWidth={4} label={<Trophy className="size-4 text-accent-violetSoft" />} />} value={`Lv.${stats.level}`} label="Current level" />
          <StatCard icon={<Flame className="size-6 fill-orange-400 text-orange-400" />} value={`${progress.streakDays}d`} label="Current streak" />
          <StatCard icon={<Target className="size-6 text-accent-cyan" />} value={`${stats.accuracy}%`} label="Accuracy" />
          <StatCard icon={<TrendingUp className="size-6 text-success" />} value={stats.totalSessions} label="Sessions played" />
        </div>
      )}

      {!isFirstTime && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <ProgressRing value={readiness.score} size={60} strokeWidth={5} label={<span className="text-sm font-bold text-zinc-50">{readiness.score}</span>} />
              <div>
                <p className="text-sm font-semibold text-zinc-50">{readiness.label}</p>
                <p className="mt-1 text-xs text-zinc-400">{readiness.basis}</p>
                <p className="mt-1 text-[11px] text-zinc-600">An estimate from your own practice, not a hiring prediction.</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-50">This week</span>
                <CalendarRange className="size-4 text-accent-cyan" />
              </div>
              <p className="text-2xl font-bold text-zinc-50">
                {weeklyPractice.sessionsThisWeek}
                <span className="text-sm font-normal text-zinc-500">/{weeklyPractice.weeklyGoal} sessions</span>
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-base-300">
                <div
                  className="h-full rounded-full bg-accent-cyan transition-[width]"
                  style={{ width: `${Math.min(100, Math.round((weeklyPractice.sessionsThisWeek / weeklyPractice.weeklyGoal) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500">
                {weeklyPractice.daysSinceLastPractice === null
                  ? "No sessions yet this week."
                  : weeklyPractice.daysSinceLastPractice === 0
                    ? "Practiced today."
                    : `Last practiced ${weeklyPractice.daysSinceLastPractice}d ago.`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Continue Learning */}
        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone="violet">{activeSession ? "Session in progress" : "Continue learning"}</Badge>
              <h2 className="mt-2 text-lg font-semibold text-zinc-50">{continueGame ? continueGame.name : "Start with Python"}</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {activeSession
                  ? `You're ${activeSession.currentIndex}/${activeSession.questionIds.length} through a ${DIFFICULTY_META[activeSession.difficulty].label} session.`
                  : continueGame
                    ? `Pick up where you left off at ${DIFFICULTY_META[continueDifficulty].label} difficulty.`
                    : "Beginner-friendly, no prior experience assumed."}
              </p>
            </div>
            <LinkButton size="lg" className="shrink-0" to={continueGame ? `/arena/${continueGame.id}/${continueDifficulty}` : "/play/python"}>
              {activeSession ? "Resume session" : "Continue"} <ArrowRight className="size-4" />
            </LinkButton>
          </CardContent>
        </Card>

        {/* Daily Challenge */}
        <Card className="relative overflow-hidden">
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-accent-violet/20 blur-2xl" />
          <CardContent className="relative flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2 text-accent-violetSoft">
              <Sparkles className="size-4" />
              <span className="text-sm font-semibold">Daily Challenge</span>
            </div>
            {daily ? (
              <>
                <p className="text-sm text-zinc-300">
                  {daily.gameName} &middot; {daily.topic}
                </p>
                <Badge tone="cyan" className="w-fit">
                  {DIFFICULTY_META[daily.difficulty].label}
                </Badge>
                <LinkButton variant="secondary" size="sm" className="mt-1 w-fit" to={`/arena/${daily.gameId}/${daily.difficulty}`}>
                  Take today's challenge
                </LinkButton>
              </>
            ) : (
              <p className="text-sm text-zinc-400">No games available yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {nextChallenge && (
        <Card className="border-accent-violet/30 bg-accent-violet/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex items-start gap-2 text-sm text-zinc-200">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-accent-violetSoft" />
              <span>{nextChallenge.reason}</span>
            </div>
            <LinkButton size="sm" variant="outline" to={`/arena/${nextChallenge.gameId}/${nextChallenge.difficulty}`}>
              {nextChallenge.kind === "review" ? "Review now" : "Start"}
            </LinkButton>
          </CardContent>
        </Card>
      )}

      {/* Study plan */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          {progress.studyPlan ? (
            dueStudyDay ? (
              <>
                <div className="flex items-center gap-2 text-sm text-zinc-200">
                  <CalendarRange className="size-4 text-accent-violetSoft" />
                  <span>
                    Today's plan: {dueStudyDay.gameName} &middot; {DIFFICULTY_META[dueStudyDay.difficulty].label}
                    {dueStudyDay.isRevision ? " (revision)" : ""} &middot; ~{dueStudyDay.estimatedMinutes} min
                  </span>
                </div>
                <LinkButton size="sm" variant="outline" to={`/arena/${dueStudyDay.gameId}/${dueStudyDay.difficulty}`}>
                  Start today's session
                </LinkButton>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-zinc-200">
                  <CalendarRange className="size-4 text-accent-violetSoft" />
                  <span>Your study plan is complete. Nice work.</span>
                </div>
                <LinkButton size="sm" variant="outline" to="/study-plan">
                  View plan
                </LinkButton>
              </>
            )
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-zinc-200">
                <CalendarRange className="size-4 text-accent-violetSoft" />
                <span>Build a personalized study plan around your goals and available time.</span>
              </div>
              <LinkButton size="sm" variant="outline" to="/study-plan">
                Create a study plan
              </LinkButton>
            </>
          )}
        </CardContent>
      </Card>

      {/* Strongest and weakest topics */}
      {(strongest.length > 0 || weakest.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {strongest.length > 0 && (
            <div>
              <SectionHeader title="Strongest topics" />
              <div className="flex flex-wrap gap-2">
                {strongest.map((t) => (
                  <Badge key={t.topic} tone="success">
                    {t.topic} &middot; {t.accuracy}%
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {weakest.length > 0 && (
            <div>
              <SectionHeader title="Needs revision" />
              <div className="flex flex-wrap gap-2">
                {weakest.map((t) => (
                  <Badge key={t.topic} tone="warning">
                    {t.topic} &middot; {t.accuracy}%
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Games */}
      <div>
        <SectionHeader title="Jump into a game" action={<Link to="/library" className="text-sm font-medium text-accent-violetSoft hover:underline">View all</Link>} />
        {featuredGames.length === 0 ? (
          <EmptyState title="No games available yet" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredGames.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        )}
      </div>

      {/* Recent sessions */}
      {stats.recentSessions.length > 0 && (
        <div>
          <SectionHeader title="Recently played" />
          <div className="flex flex-col gap-2">
            {stats.recentSessions.map((s) => {
              const g = getGame(s.gameId)
              const correct = s.attempts.filter((a) => a.correct).length
              return (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-base-300">
                        <Icon name={g?.icon ?? "Gamepad2"} className="size-4 text-accent-violetSoft" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{g?.name ?? s.gameId}</p>
                        <p className="text-xs text-zinc-500">{DIFFICULTY_META[s.difficulty].label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-100">
                        {correct}/{s.attempts.length}
                      </p>
                      <p className="text-xs text-zinc-500">+{s.xpEarned} XP</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {isFirstTime && (
        <EmptyState
          icon="Rocket"
          title="Your journey starts here"
          description="Play your first session to start tracking XP, streaks, and achievements -- all saved locally in this browser."
          action={
            <LinkButton className="mt-2" to="/library">
              Browse the game library
            </LinkButton>
          }
        />
      )}

      {progress.unlockedAchievements.length > 0 && (
        <div>
          <SectionHeader title="Achievements" action={<Link to="/progress" className="text-sm font-medium text-accent-violetSoft hover:underline">View all</Link>} />
          <div className="flex flex-wrap gap-2">
            {progress.unlockedAchievements.slice(-6).map((id) => {
              const a = ACHIEVEMENTS.find((a) => a.id === id)
              if (!a) return null
              return (
                <Badge key={id} tone="violet">
                  <Icon name={a.icon} className="size-3" /> {a.title}
                </Badge>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: ReactNode; label: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-2 p-4">
        {icon}
        <div>
          <p className="text-lg font-bold text-zinc-50">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      {action}
    </div>
  )
}
