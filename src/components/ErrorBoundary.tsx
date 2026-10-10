import * as React from "react"
import { CrashScreen } from "@/components/CrashScreen"

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

// A last-resort safety net -- but NOT the primary one. React Router's
// data router (createBrowserRouter) installs its own implicit error
// boundary around every route's render output, and that inner boundary
// catches a route-render crash before it can ever reach a React error
// boundary sitting outside <RouterProvider> like this one (React always
// hands an error to the *nearest* boundary up the tree). The routes'
// own `errorElement` entries in app/routes.tsx are what actually catch
// the vast majority of real crashes; confirmed live by deliberately
// triggering a render error and watching React Router's default error
// page appear instead of this component's output.
//
// This class component still earns its place for anything that throws
// outside the router's tree entirely (App.tsx's own render, or future
// code added alongside <AppRouter />) -- belt-and-suspenders, not the
// main fix.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Interview Arena crashed:", error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <CrashScreen />
    }
    return this.props.children
  }
}
