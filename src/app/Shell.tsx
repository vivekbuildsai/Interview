import { NavLink, Outlet } from "react-router-dom"
import { Flame, Moon, Sun, Zap } from "lucide-react"
import { Icon } from "@/components/ui/Icon"
import { cn } from "@/lib/cn"
import { NAV_ITEMS } from "./nav"
import { useArenaStore } from "@/lib/store"
import { overallStats } from "@/lib/derived"

function Logo() {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-violet to-accent-cyan shadow-glow">
        <Zap className="size-4 text-white" fill="currentColor" />
      </div>
      <span className="text-sm font-bold tracking-tight text-zinc-50">Interview Arena</span>
    </div>
  )
}

function NavLinks({ onNavigate, orientation = "vertical" }: { onNavigate?: () => void; orientation?: "vertical" | "horizontal" }) {
  return (
    <nav className={cn("flex gap-1", orientation === "vertical" ? "flex-col" : "flex-row justify-between")}>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              orientation === "horizontal" && "flex-1 flex-col gap-1 px-1 py-1.5 text-[11px]",
              isActive ? "bg-base-300 text-white shadow-[0_0_0_1px_rgba(139,92,246,0.25)]" : "text-zinc-400 hover:bg-base-300/60 hover:text-zinc-100",
            )
          }
        >
          <Icon name={item.icon} className={orientation === "horizontal" ? "size-5" : "size-[18px]"} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function StreakAndXp() {
  const progress = useArenaStore((s) => s.progress)
  const stats = overallStats(progress)

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-1.5 rounded-full border border-base-400 bg-base-200/80 px-2.5 py-1 text-xs font-semibold text-orange-300" title={`${progress.streakDays}-day streak`}>
        <Flame className="size-3.5 fill-orange-400 text-orange-400" />
        {progress.streakDays}
      </div>
      <div className="hidden items-center gap-2 rounded-full border border-base-400 bg-base-200/80 px-3 py-1 text-xs font-semibold text-accent-violetSoft sm:flex" title={`Level ${stats.level}`}>
        <Zap className="size-3.5" />
        Lv.{stats.level}
      </div>
    </div>
  )
}

function ThemeToggle() {
  const theme = useArenaStore((s) => s.progress.theme)
  const toggleTheme = useArenaStore((s) => s.toggleTheme)
  return (
    <button onClick={toggleTheme} className="focus-ring flex size-9 items-center justify-center rounded-lg border border-base-400 bg-base-200/80 text-zinc-300 hover:text-white" aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

export function AppShell() {
  return (
    <div className="bg-arena min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col gap-6 border-r border-base-400/70 bg-base-50/90 p-4 backdrop-blur-sm lg:flex">
        <Logo />
        <NavLinks />
        <div className="mt-auto rounded-xl border border-base-400 bg-base-200/60 p-3 text-xs text-zinc-400">
          <p className="font-medium text-zinc-300">Progress is saved locally</p>
          <p className="mt-1">Your XP, streaks, and history live in this browser -- no account needed.</p>
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-base-400/60 bg-base-0/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:justify-end">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <StreakAndXp />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-base-400/70 bg-base-50/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur-md lg:hidden">
        <NavLinks orientation="horizontal" />
      </div>
    </div>
  )
}
