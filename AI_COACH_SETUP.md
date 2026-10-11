# AI Interview Coach — Setup

The AI coach is **not configured by default**. Without the steps below, the
`/coach` page is fully functional UI that honestly reports "not configured" —
it never fabricates a response. This is intentional: shipping a fake AI reply
would be worse than shipping none.

## What already exists

- `api/coach.ts` — a Vercel serverless function (Node.js runtime). This is the
  **only** place in the codebase allowed to hold an AI provider secret or the
  Supabase service-role key.
- `src/lib/aiCoach.ts` — the frontend client, which calls `/api/coach` and
  never talks to an AI provider directly.
- `supabase/migrations/0005_add_ai_coach_usage.sql` — a table used only by the
  serverless function (via the service-role key) to enforce a per-user rate
  limit, with RLS enabled and no policies granted to `anon`/`authenticated`.

## What you need to configure

All of these are **server-side environment variables** in your Vercel project
settings (Project → Settings → Environment Variables). None of them should
ever be prefixed `VITE_` — a `VITE_` variable gets bundled into the browser
JS and would leak the secret to every visitor.

1. **`ANTHROPIC_API_KEY`** (required) — a real Anthropic API key. Get one at
   [console.anthropic.com](https://console.anthropic.com). Without this, every
   request to `/api/coach` returns a `501` with `configured: false`, and the
   UI shows an honest "not set up yet" message.

2. **`SUPABASE_SERVICE_ROLE_KEY`** (required) — from your Supabase project's
   API settings (Project Settings → API → `service_role` secret key — **not**
   the `anon` key already used by the frontend). This is used only inside
   `api/coach.ts` to read/write the rate-limit table. It is never sent to the
   browser.

3. **`ANTHROPIC_MODEL`** (optional) — defaults to `claude-haiku-4-5-20251001`
   if unset. Override to use a different Claude model.

4. Apply the migration if you haven't already:

   ```bash
   supabase db push
   ```

   This creates `ai_coach_requests` (used for rate limiting) with RLS enabled
   and no `anon`/`authenticated` grants — only the service-role key (used
   server-side only) can read or write it.

## What this does and doesn't do

- Requires the user to be signed in (via the existing Supabase auth already
  used for cloud sync). There is no anonymous/guest path to the AI provider.
- Rate-limits each user to 20 requests/hour, enforced server-side against the
  `ai_coach_requests` table — not something the client can bypass.
- Sends the AI provider only the user's typed question plus an optional,
  explicitly allow-listed context object (`gameName`/`topic`/`difficulty`,
  each capped at 200 characters). It never sends the user's email, user id,
  session history, or anything else.
- Caps the response to 600 tokens and the request message to 2000 characters,
  to bound cost per request.
- Never claims to execute code. The system prompt explicitly tells the model
  it is not a code execution environment — only the existing Python
  challenge runtime (Pyodide, in the browser) can make that claim honestly.

## Verifying it's working

After setting the environment variables and redeploying:

1. Sign in on the deployed site.
2. Go to **Settings → AI Interview Coach → Open the coach**.
3. Ask a question. You should get a real reply within a few seconds.
4. If you instead see "The AI coach isn't set up on this deployment yet," the
   `ANTHROPIC_API_KEY` environment variable isn't reaching the serverless
   function — check it was added to the correct Vercel environment
   (Production/Preview/Development) and redeploy.
