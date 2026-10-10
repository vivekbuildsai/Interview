import { useEffect } from "react"
import { AppRouter } from "@/app/routes"
import { useArenaStore } from "@/lib/store"

export function App() {
  const theme = useArenaStore((s) => s.progress.theme)

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light")
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  return <AppRouter />
}
