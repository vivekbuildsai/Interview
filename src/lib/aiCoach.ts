// Thin client for the AI coach serverless function (api/coach.ts). This
// module never talks to an AI provider directly and never holds a
// provider secret -- it just calls our own backend, which is the only
// place that secret can live. See AI_COACH_SETUP.md for what the site
// owner needs to configure before this does anything but report
// "not configured".

import { supabase } from "@/lib/supabase/client"

export interface CoachContext {
  gameName?: string
  topic?: string
  difficulty?: string
}

export type CoachResult = { ok: true; reply: string } | { ok: false; reason: "unauthenticated" | "not_configured" | "rate_limited" | "error"; message: string }

export async function askCoach(message: string, context?: CoachContext): Promise<CoachResult> {
  if (!supabase) {
    return { ok: false, reason: "unauthenticated", message: "Sign in to use the AI coach." }
  }

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    return { ok: false, reason: "unauthenticated", message: "Sign in to use the AI coach." }
  }

  let response: Response
  try {
    response = await fetch("/api/coach", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ message, context }),
    })
  } catch {
    return { ok: false, reason: "error", message: "Couldn't reach the AI coach. Check your connection and try again." }
  }

  const data = await response.json().catch(() => ({}))

  if (response.status === 501) return { ok: false, reason: "not_configured", message: data.error ?? "The AI coach isn't configured yet." }
  if (response.status === 401) return { ok: false, reason: "unauthenticated", message: data.error ?? "Sign in to use the AI coach." }
  if (response.status === 429) return { ok: false, reason: "rate_limited", message: data.error ?? "You've asked too many questions this hour. Try again later." }
  if (!response.ok) return { ok: false, reason: "error", message: data.error ?? "Something went wrong. Please try again." }

  return { ok: true, reply: data.reply as string }
}
