import * as React from "react"
import { cn } from "@/lib/cn"

type Tone = "violet" | "cyan" | "success" | "warning" | "danger" | "neutral"

const toneClasses: Record<Tone, string> = {
  violet: "bg-accent-violet/15 text-accent-violetSoft border-accent-violet/30",
  cyan: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  neutral: "bg-base-400/60 text-zinc-300 border-base-500/60",
}

export function Badge({ tone = "neutral", className, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", toneClasses[tone], className)} {...props}>
      {children}
    </span>
  )
}
