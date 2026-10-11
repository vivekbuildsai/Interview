import { lazy, Suspense, useEffect } from "react"
import { AppRouter } from "@/app/routes"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useArenaStore } from "@/lib/store"

// Lazy: pulls in @supabase/supabase-js and the whole auth/cloud-sync
// stack as its own chunk, so a guest's initial load never downloads it.
const AuthRoot = lazy(() => import("@/features/auth/AuthRoot"))

export function App() {
  const theme = useArenaStore((s) => s.progress.theme)

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <AuthRoot />
      </Suspense>
      <AppRouter />
    </ErrorBoundary>
  )
}
