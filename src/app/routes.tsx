import { lazy, Suspense } from "react"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AppShell } from "./Shell"
import { PageLoader } from "@/components/ui/PageLoader"

const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"))
const LibraryPage = lazy(() => import("@/features/library/LibraryPage"))
const DifficultySelectPage = lazy(() => import("@/features/difficulty/DifficultySelectPage"))
const ChallengePage = lazy(() => import("@/features/challenge/ChallengePage"))
const ResultsPage = lazy(() => import("@/features/results/ResultsPage"))
const ProgressPage = lazy(() => import("@/features/progress/ProgressPage"))
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"))
const NotFoundPage = lazy(() => import("@/features/misc/NotFoundPage"))

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: withSuspense(<DashboardPage />) },
      { path: "/library", element: withSuspense(<LibraryPage />) },
      { path: "/play/:gameId", element: withSuspense(<DifficultySelectPage />) },
      { path: "/progress", element: withSuspense(<ProgressPage />) },
      { path: "/settings", element: withSuspense(<SettingsPage />) },
    ],
  },
  { path: "/arena/:gameId/:difficulty", element: withSuspense(<ChallengePage />) },
  { path: "/arena/:gameId/:difficulty/results", element: withSuspense(<ResultsPage />) },
  { path: "*", element: withSuspense(<NotFoundPage />) },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
