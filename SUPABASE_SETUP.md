# Setting up accounts and cloud sync

Interview Arena's guest mode needs none of this -- it works today exactly
as it did before. Everything below is only required to turn on "Continue
with Google" / email sign-up and cloud progress sync.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
   (any region is fine; this app makes no assumptions about region).
2. Once it's provisioned, open **Project Settings -> API**. You'll need
   two values from this page in step 4:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon / publishable key** (NOT the `service_role` key -- that one
     must never be used in this frontend-only app)

## 2. Run the database migration

In the Supabase dashboard, open **SQL Editor**, paste in the contents of
[`supabase/migrations/0001_user_progress_and_sessions.sql`](supabase/migrations/0001_user_progress_and_sessions.sql)
from this repo, and run it. This creates:

- `user_progress` -- one row per user, the aggregate XP/achievements/streaks/settings document
- `session_history` -- one row per completed session
- Row Level Security policies on both tables, so a user can only ever read or write their own rows
- `upsert_user_progress(...)` -- a function that safely merges progress without letting an out-of-order request overwrite newer data

(If you have the Supabase CLI set up with this project linked, `supabase db push` applies the same file instead of pasting it manually.)

## 3. Configure Google OAuth

1. In the [Google Cloud Console](https://console.cloud.google.com/), create (or reuse) a project, then go to **APIs & Services -> Credentials -> Create Credentials -> OAuth client ID**.
2. Application type: **Web application**.
3. **Authorized redirect URIs** -- add your Supabase project's callback URL, shown on Supabase's **Authentication -> Providers -> Google** page. It looks like:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Save, then copy the generated **Client ID** and **Client Secret**.
5. Back in Supabase: **Authentication -> Providers -> Google** -> paste the Client ID and Client Secret -> enable the provider -> save.

## 4. Configure redirect URLs in Supabase

Still in Supabase, go to **Authentication -> URL Configuration** and set:

- **Site URL**: your production URL (e.g. `https://interview-vivekbuildsai.vercel.app`)
- **Redirect URLs** (add all that apply, one per line):
  - `http://localhost:5174/auth/callback` (local dev)
  - `https://interview-vivekbuildsai.vercel.app/auth/callback` (production)
  - Any Vercel preview-deployment URL pattern you want OAuth/email links to work on, e.g. `https://interview-*-vivekbuildsai.vercel.app/auth/callback` if your Supabase plan supports wildcard redirect URLs -- otherwise preview deployments will fall back to the Site URL after a successful sign-in, which is safe (never an error), just not the exact preview domain.

This app's own OAuth/email code already points at `/auth/callback` on whichever origin it's running on ([src/lib/auth/authStore.ts](src/lib/auth/authStore.ts)) -- nothing else in the code needs to change when you add more allowed redirect URLs here.

## 5. Set environment variables

Local development: copy [`.env.example`](.env.example) to `.env.local` and fill in the two values from step 1. `.env.local` is gitignored and never committed.

```bash
cp .env.example .env.local
```

Vercel (Project Settings -> Environment Variables), add for **Production**, **Preview**, and **Development** environments:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your Project URL from step 1 |
| `VITE_SUPABASE_ANON_KEY` | your anon/publishable key from step 1 |

Both are safe to set as plain (non-"sensitive") env vars -- they're meant to ship in the built frontend bundle; Postgres RLS is what actually protects data, not keeping this key secret. Redeploy after adding them (Vercel doesn't retroactively inject env vars into an already-built deployment).

## 6. Email templates (optional but recommended)

Supabase's default "Confirm signup" and "Reset password" email templates work out of the box and already link to `/auth/callback`. If you want to customize sender name/branding, that's under **Authentication -> Email Templates** -- no code changes needed either way.

## What's already handled in code, so you don't need to do anything else

- Session restore on reload, sign-out, loading/error states -- [src/lib/auth/authStore.ts](src/lib/auth/authStore.ts)
- The OAuth/email-link callback route and "return to where you were" behavior -- [src/features/auth/AuthCallbackPage.tsx](src/features/auth/AuthCallbackPage.tsx)
- Guest-to-account progress migration -- [src/lib/cloud/merge.ts](src/lib/cloud/merge.ts) (policy documented in that file and in the final report)
- Debounced, retry-safe cloud sync -- [src/lib/cloud/useCloudSync.ts](src/lib/cloud/useCloudSync.ts)

Until you complete the steps above, `isSupabaseConfigured()` returns false and the app simply hides every auth-related UI element -- guests can't tell the difference, and nothing ever throws.
