// Everything that needs @supabase/supabase-js lives behind this one lazy
// boundary (see src/App.tsx) so a guest who never touches auth never
// downloads it as part of the main bundle -- confirmed necessary by a real
// production build: without this split, adding Supabase roughly doubled
// the main chunk's gzipped size (~99KB -> ~203KB) for every visitor.

import { useEffect } from "react"
import { useAuthStore } from "@/lib/auth/authStore"
import { useCloudSync } from "@/lib/cloud/useCloudSync"
import { WelcomeGate } from "./WelcomeGate"

export default function AuthRoot() {
  const initAuth = useAuthStore((s) => s.initAuth)

  useEffect(() => {
    initAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribes once, not meant to re-run per render.
  }, [])

  useCloudSync()

  return <WelcomeGate />
}
