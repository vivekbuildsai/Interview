-- Tracks AI coach requests per user so the serverless function (see
-- api/coach.ts) can enforce a rate limit without any external service
-- (Redis, etc.) -- this table is the smallest piece of new
-- infrastructure needed, reusing the Supabase project this app already
-- requires. It is read and written ONLY by the serverless function
-- using the service-role key; it is never exposed to the frontend, so
-- RLS is enabled with no policies at all for anon/authenticated --
-- service_role bypasses RLS by design, which is the only access path
-- this table needs.
create table if not exists public.ai_coach_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_coach_requests_user_id_created_at_idx on public.ai_coach_requests (user_id, created_at);

alter table public.ai_coach_requests enable row level security;

revoke all on public.ai_coach_requests from public, anon, authenticated;
