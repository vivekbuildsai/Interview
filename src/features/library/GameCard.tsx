import { Link } from "react-router-dom"
import { Lock, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Icon } from "@/components/ui/Icon"
import { ProgressBar } from "@/components/ui/ProgressBar"
import type { GameDefinition } from "@/lib/types"
import { gameProgressPct, highestClearedDifficulty } from "@/lib/derived"
import { useArenaStore } from "@/lib/store"
import { DIFFICULTY_META } from "@/lib/types"

export function GameCard({ game }: { game: GameDefinition }) {
  const sessions = useArenaStore((s) => s.progress.sessions)
  const pct = gameProgressPct(sessions, game.id)
  const cleared = highestClearedDifficulty(sessions, game.id)
  const difficultyCount = 5

  const inner = (
    <Card className="group relative flex h-full flex-col overflow-hidden transition-all duration-200 hover:border-accent-violet/50 hover:shadow-glow">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${game.accent}`} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${game.accent} shadow-glow`}>
            <Icon name={game.icon} className="size-5 text-white" />
          </div>
          {game.comingSoon && (
            <Badge tone="neutral" className="shrink-0">
              <Lock className="size-3" /> Coming soon
            </Badge>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-zinc-50">{game.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{game.shortDescription}</p>
        </div>

        <div className="mt-auto flex flex-col gap-2.5 pt-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{game.questions.length > 0 ? `${game.questions.length} challenges` : "Content coming soon"}</span>
            {cleared && <span className="text-accent-cyan">Cleared: {DIFFICULTY_META[cleared].label}</span>}
          </div>
          {!game.comingSoon && (
            <>
              <ProgressBar value={pct} className="h-1.5" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">
                  {pct}% mastered &middot; {difficultyCount} levels
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-accent-violetSoft opacity-0 transition-opacity group-hover:opacity-100">
                  Play <ArrowRight className="size-3.5" />
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  )

  if (game.comingSoon) {
    return <div className="cursor-not-allowed opacity-60">{inner}</div>
  }

  return (
    <Link to={`/play/${game.id}`} className="focus-ring block rounded-2xl">
      {inner}
    </Link>
  )
}
