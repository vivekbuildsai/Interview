import { useEffect } from "react"
import { AppRouter } from "@/app/routes"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { useArenaStore } from "@/lib/store"

export function App() {
  const theme = useArenaStore((s) => s.progress.theme)

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  )
}
