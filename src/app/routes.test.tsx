// This exists because of a real bug found during a production-readiness
// audit: a plain React error boundary wrapping <RouterProvider> from the
// outside (src/components/ErrorBoundary.tsx) never actually catches a
// route-render crash -- React Router's data router installs its own
// implicit error boundary per route, and that inner one wins every time
// (React always hands an error to the nearest boundary up the tree).
// Confirmed live: before routes.tsx gained `errorElement` entries, a
// corrupted-but-structurally-valid localStorage value crashed straight
// through to React Router's raw, unstyled default error page. These
// tests prove the app's own CrashScreen renders instead.

import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { RouteErrorFallback } from "@/components/RouteErrorFallback"

function Bomb(): React.ReactElement {
  throw new Error("boom")
}

describe("route-level error handling", () => {
  it("renders the app's CrashScreen, not React Router's raw default error page, when a route throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const router = createMemoryRouter([{ path: "/", element: <Bomb />, errorElement: <RouteErrorFallback /> }], { initialEntries: ["/"] })
    render(<RouterProvider router={router} />)

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reload interview arena/i })).toBeInTheDocument()
    // React Router's own default error element renders this exact phrase --
    // its absence is what proves our errorElement won the race, not its.
    expect(screen.queryByText(/unexpected application error/i)).not.toBeInTheDocument()

    consoleSpy.mockRestore()
  })

  it("without an errorElement, a route crash is NOT caught by anything outside the router (documents why the plain ErrorBoundary alone was insufficient)", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const router = createMemoryRouter([{ path: "/", element: <Bomb /> }], { initialEntries: ["/"] })
    render(<RouterProvider router={router} />)

    // React Router's own built-in fallback renders -- never a blank
    // page, but also never this app's CrashScreen -- which is exactly
    // the gap `errorElement` on every route closes.
    expect(await screen.findByText(/unexpected application error/i)).toBeInTheDocument()
    expect(screen.queryByText(/reload interview arena/i)).not.toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
