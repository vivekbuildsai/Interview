export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span className="size-2 animate-pulse rounded-full bg-accent-violet" />
        <span className="size-2 animate-pulse rounded-full bg-accent-violet [animation-delay:150ms]" />
        <span className="size-2 animate-pulse rounded-full bg-accent-violet [animation-delay:300ms]" />
      </div>
    </div>
  )
}
