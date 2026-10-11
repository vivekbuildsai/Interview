// AI interview coach -- Vercel serverless function (Node.js runtime).
//
// This is the ONLY place in the whole codebase that may see an AI
// provider secret or the Supabase service-role key. Both are read from
// plain (never VITE_-prefixed) environment variables that Vercel only
// exposes to serverless functions, never to the browser bundle.
//
// Security properties this function is responsible for:
//   - Requires a valid Supabase-authenticated user (verified against
//     Supabase's own auth server, not just decoded) -- guests cannot
//     call this; there is no anonymous path to the AI provider.
//   - Validates and caps the size of everything in the request body.
//   - Rate-limits per user via a Supabase table (ai_coach_requests),
//     written only with the service-role key -- no external service
//     (Redis, etc.) is required for this.
//   - Sends the AI provider only the user's message plus a small,
//     explicitly-allow-listed context object (game/topic/difficulty) --
//     never the user's email, id, full session history, or anything
//     else that isn't needed to answer the question.
//   - If ANTHROPIC_API_KEY isn't configured, returns a clear, honest
//     "not configured" response. It never fabricates an AI reply.
//
// See AI_COACH_SETUP.md at the repo root for exactly what to configure.

import { createClient } from "@supabase/supabase-js"

const MAX_MESSAGE_LENGTH = 2000
const MAX_CONTEXT_FIELD_LENGTH = 200
const MAX_REQUESTS_PER_HOUR = 20
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001"
const ANTHROPIC_MAX_TOKENS = 600

interface CoachRequestBody {
  message: string
  context?: {
    gameName?: string
    topic?: string
    difficulty?: string
  }
}

interface MinimalRequest {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body: unknown
}

interface MinimalResponse {
  status(code: number): MinimalResponse
  json(body: unknown): void
}

function badRequest(res: MinimalResponse, message: string) {
  res.status(400).json({ error: message })
}

function parseBody(raw: unknown): CoachRequestBody | null {
  const body = typeof raw === "string" ? safeJsonParse(raw) : raw
  if (!body || typeof body !== "object") return null
  const message = (body as Record<string, unknown>).message
  if (typeof message !== "string" || message.trim().length === 0 || message.length > MAX_MESSAGE_LENGTH) return null

  const rawContext = (body as Record<string, unknown>).context
  let context: CoachRequestBody["context"]
  if (rawContext && typeof rawContext === "object") {
    const c = rawContext as Record<string, unknown>
    context = {}
    for (const key of ["gameName", "topic", "difficulty"] as const) {
      const value = c[key]
      if (typeof value === "string" && value.length <= MAX_CONTEXT_FIELD_LENGTH) {
        context[key] = value
      }
    }
  }

  return { message, context }
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function authenticate(req: MinimalRequest): Promise<{ userId: string } | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  const authHeader = req.headers.authorization
  const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : null
  if (!token) return null

  // Verifying against Supabase's own auth server (not just decoding the
  // JWT locally) is deliberate -- it confirms the token is still valid
  // right now (not revoked/expired) without this function needing the
  // JWT signing secret at all.
  const authClient = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await authClient.auth.getUser(token)
  if (error || !data.user) return null
  return { userId: data.user.id }
}

function serviceRoleClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  // This client is only ever constructed inside this serverless
  // function, using a key that is never exposed to the frontend.
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
}

async function checkAndRecordRateLimit(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = serviceRoleClient()
  if (!client) return { ok: false, error: "Rate limiting is not configured." }

  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await client.from("ai_coach_requests").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", windowStart)
  if (countError) return { ok: false, error: countError.message }
  if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) return { ok: false, error: "rate_limited" }

  const { error: insertError } = await client.from("ai_coach_requests").insert({ user_id: userId })
  if (insertError) return { ok: false, error: insertError.message }

  return { ok: true }
}

async function callAnthropic(message: string, context: CoachRequestBody["context"]): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { ok: false, error: "not_configured" }

  const contextLine = context && (context.gameName || context.topic || context.difficulty) ? `The learner is currently practicing: ${[context.gameName, context.topic, context.difficulty].filter(Boolean).join(" / ")}.` : ""

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: "You are a concise, encouraging technical interview coach helping someone prepare for software engineering interviews. Answer the learner's question directly. Keep answers focused and under 200 words unless the question genuinely requires more. Never claim to have executed code -- you can discuss and explain code, but you are not a code execution environment.",
      messages: [{ role: "user", content: contextLine ? `${contextLine}\n\n${message}` : message }],
    }),
  })

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "")
    return { ok: false, error: `Anthropic API error (${response.status}): ${bodyText.slice(0, 300)}` }
  }

  const data = (await response.json()) as { content?: { type: string; text?: string }[] }
  const reply = data.content?.find((block) => block.type === "text")?.text
  if (!reply) return { ok: false, error: "Anthropic API returned no text content." }

  return { ok: true, reply }
}

export default async function handler(req: MinimalRequest, res: MinimalResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." })
    return
  }

  const parsed = parseBody(req.body)
  if (!parsed) {
    badRequest(res, `Request must include a non-empty "message" string of at most ${MAX_MESSAGE_LENGTH} characters.`)
    return
  }

  const auth = await authenticate(req)
  if (!auth) {
    res.status(401).json({ error: "Sign in to use the AI coach." })
    return
  }

  const rateLimit = await checkAndRecordRateLimit(auth.userId)
  if (!rateLimit.ok) {
    if (rateLimit.error === "rate_limited") {
      res.status(429).json({ error: `You've reached the limit of ${MAX_REQUESTS_PER_HOUR} coach questions per hour. Try again later.` })
    } else {
      res.status(500).json({ error: "Could not verify rate limit. Please try again." })
    }
    return
  }

  const result = await callAnthropic(parsed.message, parsed.context)
  if (!result.ok) {
    if (result.error === "not_configured") {
      res.status(501).json({ error: "The AI coach isn't configured yet. See AI_COACH_SETUP.md for what the site owner needs to set up.", configured: false })
    } else {
      res.status(502).json({ error: "The AI provider request failed. Please try again shortly." })
    }
    return
  }

  res.status(200).json({ reply: result.reply, configured: true })
}
