import { useMemo, useState, type ReactNode } from "react"
import { Search } from "lucide-react"
import { GAMES, CATEGORIES } from "@/lib/gameRegistry"
import { GameCard } from "./GameCard"
import { cn } from "@/lib/cn"
import { EmptyState } from "@/components/ui/EmptyState"

export default function LibraryPage() {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string | "all">("all")

  const filtered = useMemo(() => {
    return GAMES.filter((g) => {
      const matchesCategory = category === "all" || g.category === category
      const matchesQuery = query.trim().length === 0 || g.name.toLowerCase().includes(query.toLowerCase()) || g.shortDescription.toLowerCase().includes(query.toLowerCase())
      return matchesCategory && matchesQuery
    })
  }, [query, category])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">Game Library</h1>
        <p className="mt-1 text-sm text-zinc-400">Browse every technical domain -- pick one and choose your difficulty.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search games..."
            className="focus-ring h-10 w-full rounded-lg border border-base-400 bg-base-100 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 overflow-x-auto sm:flex-nowrap">
          <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </FilterChip>
          {CATEGORIES.map((c) => (
            <FilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </FilterChip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="SearchX" title="No games match your search" description="Try a different keyword or clear the category filter." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "focus-ring shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-accent-violet bg-accent-violet/15 text-accent-violetSoft" : "border-base-400 bg-base-200/60 text-zinc-400 hover:text-zinc-200",
      )}
    >
      {children}
    </button>
  )
}
