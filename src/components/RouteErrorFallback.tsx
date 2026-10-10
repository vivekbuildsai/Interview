import { useRouteError } from "react-router-dom"
import { CrashScreen } from "@/components/CrashScreen"

// This is the fallback React Router actually renders for a route-render
// crash (see ErrorBoundary.tsx for why a plain React error boundary
// outside <RouterProvider> cannot catch these). Logged to the console
// for diagnosis, same as the other boundary -- the user only ever sees
// the friendly CrashScreen, never a raw stack trace.
export function RouteErrorFallback() {
  const error = useRouteError()
  // eslint-disable-next-line no-console
  console.error("Interview Arena route crashed:", error)
  return <CrashScreen />
}
