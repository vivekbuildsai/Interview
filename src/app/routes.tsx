import { lazy, Suspense } from "react"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { AppShell } from "./Shell"
import { PageLoader } from "@/components/ui/PageLoader"
import { RouteErrorFallback } from "@/components/RouteErrorFallback"

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

// Every top-level entry gets its own errorElement: React Router's data
// router catches a route-render crash at the *nearest* ancestor route
// that defines one, and does not fall back to a plain React error
// boundary rendered outside <RouterProvider> -- confirmed live by
// deliberately triggering a render crash and watching React Router's
// own (unstyled, stack-trace-dumping) default error page appear instead
// of this app's fallback until this was added.
const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorFallback />,
    children: [
      { path: "/", element: withSuspense(<DashboardPage />) },
      { path: "/library", element: withSuspense(<LibraryPage />) },
      { path: "/play/:gameId", element: withSuspense(<DifficultySelectPage />) },
      { path: "/progress", element: withSuspense(<ProgressPage />) },
      { path: "/settings", element: withSuspense(<SettingsPage />) },
    ],
  },
  { path: "/arena/:gameId/:difficulty", element: withSuspense(<ChallengePage />), errorElement: <RouteErrorFallback /> },
  { path: "/arena/:gameId/:difficulty/results", element: withSuspense(<ResultsPage />), errorElement: <RouteErrorFallback /> },
  { path: "*", element: withSuspense(<NotFoundPage />), errorElement: <RouteErrorFallback /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
