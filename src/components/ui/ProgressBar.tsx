import { cn } from "@/lib/cn"

export function ProgressBar({ value, className, trackClassName, barClassName }: { value: number; className?: string; trackClassName?: string; barClassName?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-base-300", trackClassName, className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-cyan transition-[width] duration-500 ease-out", barClassName)}
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  )
}
