import type { ReactNode } from "react"
import { Icon } from "./Icon"

export function EmptyState({ icon = "Inbox", title, description, action }: { icon?: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-base-400 bg-base-100/50 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-base-300 text-accent-violetSoft">
        <Icon name={icon} className="size-6" />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-zinc-400">{description}</p>}
      </div>
      {action}
    </div>
  )
}
