import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/Button"

// Shared fallback UI for both error-catching paths in this app (see
// ErrorBoundary.tsx for why there are two): a crashed page always looks
// the same to the visitor, and always offers the same one way out.
export function CrashScreen() {
  return (
    <div className="bg-arena flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="size-7" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-zinc-50">Something went wrong</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          Interview Arena hit an unexpected error. Your saved progress is untouched -- it lives in this browser's storage, not in this crashed page. Reloading usually fixes it.
        </p>
      </div>
      <Button onClick={() => (window.location.href = "/")}>
        <RotateCcw className="size-4" /> Reload Interview Arena
      </Button>
    </div>
  )
}
