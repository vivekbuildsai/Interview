import { Link, Navigate, useParams } from "react-router-dom"
import { ArrowRight, Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Icon } from "@/components/ui/Icon"
import { LinkButton } from "@/components/ui/Button"
import { getGame, questionsForDifficulty } from "@/lib/gameRegistry"
import { DIFFICULTIES, DIFFICULTY_META, type Difficulty } from "@/lib/types"
import { useArenaStore } from "@/lib/store"
import { highestClearedDifficulty } from "@/lib/derived"
import { cn } from "@/lib/cn"

function recommendedDifficulty(cleared: Difficulty | null): Difficulty {
  if (!cleared) return "beginner"
  const idx = DIFFICULTIES.indexOf(cleared)
  return DIFFICULTIES[Math.min(idx + 1, DIFFICULTIES.length - 1)]
}

export default function DifficultySelectPage() {
  const { gameId } = useParams<{ gameId: string }>()
  const game = gameId ? getGame(gameId) : undefined
  const sessions = useArenaStore((s) => s.progress.sessions)

  if (!game || game.comingSoon) {
    return <Navigate to="/library" replace />
  }

  const cleared = highestClearedDifficulty(sessions, game.id)
  const recommended = recommendedDifficulty(cleared)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className={cn("flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-glow", game.accent)}>
          <Icon name={game.icon} className="size-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">{game.name}</h1>
          <p className="text-sm text-zinc-400">{game.shortDescription}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {game.syllabus.slice(0, 6).map((topic) => (
          <Badge key={topic} tone="neutral">
            {topic}
          </Badge>
        ))}
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-accent-violetSoft">
          <Sparkles className="size-4" />
          Recommended: {DIFFICULTY_META[recommended].label}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {DIFFICULTIES.map((difficulty) => {
            const meta = DIFFICULTY_META[difficulty]
            const count = questionsForDifficulty(game.id, difficulty).length
            const isRecommended = difficulty === recommended
            const isCleared = cleared ? DIFFICULTIES.indexOf(difficulty) <= DIFFICULTIES.indexOf(cleared) : false

            return (
              <Card key={difficulty} className={cn("relative overflow-hidden transition-all", isRecommended && "ring-2 ring-accent-violet/60")}>
                <div className={cn("absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r", meta.color)} />
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{meta.short}</span>
                      <h3 className="text-lg font-semibold text-zinc-50">{meta.label}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isRecommended && <Badge tone="violet">Recommended</Badge>}
                      {isCleared && <Badge tone="success">Cleared</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400">{meta.description}</p>
                  <p className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-400">You'll practice:</span> {meta.learn}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">{count > 0 ? `${count} challenges available` : "Content coming soon"}</span>
                    {count > 0 ? (
                      <LinkButton size="sm" to={`/arena/${game.id}/${difficulty}`}>
                        Start <ArrowRight className="size-3.5" />
                      </LinkButton>
                    ) : (
                      <span className="text-xs text-zinc-600">Unavailable</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <Link to="/library" className="text-sm text-zinc-500 hover:text-zinc-300">
        &larr; Back to library
      </Link>
    </div>
  )
}
