-- Interview Arena cloud progress schema.
--
-- Design rationale (see also src/lib/types.ts UserProgressState):
-- The existing client state is one cohesive "progress" aggregate (xp,
-- achievements, streaks, topic stats, settings) plus a growing list of
-- completed sessions. Those two parts have different shapes of change:
-- the aggregate is small and gets read/written as a whole, while session
-- history only ever grows by one record at a time and would be wasteful
-- to rewrite in full on every play (see requirement: avoid writing the
-- entire progress document on every minor update). So this schema is a
-- hybrid: `user_progress` is a one-row-per-user document table for the
-- aggregate, and `session_history` is a normalized, indexed, append-only
-- table for individual completed sessions.

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  unlocked_achievements text[] not null default '{}',
  last_active_date_key text,
  streak_days integer not null default 0 check (streak_days >= 0),
  best_streak integer not null default 0 check (best_streak >= 0),
  topic_stats jsonb not null default '{}'::jsonb,
  review_queue text[] not null default '{}',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  -- Client-supplied monotonic timestamp (Date.now() in ms), used by
  -- upsert_user_progress() below to reject a stale write that arrives
  -- out of order -- never trust arrival order over actual recency.
  client_updated_at bigint not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.session_history (
  -- Reuses the client-generated session id (src/lib/id.ts newId("session"))
  -- as the primary key: completed sessions are immutable and the id is
  -- already unique, so this makes retried/duplicate inserts a no-op
  -- instead of a second row.
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'hard', 'veryHard', 'extreme')),
  started_at bigint not null,
  finished_at bigint not null check (finished_at >= started_at),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  attempts jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists session_history_user_id_idx on public.session_history (user_id);
create index if not exists session_history_user_finished_idx on public.session_history (user_id, finished_at desc);

alter table public.user_progress enable row level security;
alter table public.session_history enable row level security;

-- Ownership is enforced here, in Postgres, as the real security boundary
-- -- never only in client-side code. `with check` on insert/update also
-- blocks a user from writing a row whose user_id isn't their own auth
-- uid, i.e. they cannot reassign a record to (or create one for)
-- someone else's account.
create policy "select own progress" on public.user_progress for select using (auth.uid () = user_id);

create policy "insert own progress" on public.user_progress for insert
with
  check (auth.uid () = user_id);

create policy "update own progress" on public.user_progress for update using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

create policy "delete own progress" on public.user_progress for delete using (auth.uid () = user_id);

create policy "select own sessions" on public.session_history for select using (auth.uid () = user_id);

create policy "insert own sessions" on public.session_history for insert
with
  check (auth.uid () = user_id);

create policy "delete own sessions" on public.session_history for delete using (auth.uid () = user_id);

-- No update policy for session_history: completed sessions are treated as
-- immutable once recorded, so there's deliberately no path to mutate one
-- after the fact (only insert-once and delete, e.g. for a future "reset
-- progress" cloud action).

-- Upserts the aggregate progress document, but only applies the write if
-- the incoming client_updated_at is newer than what's already stored --
-- otherwise a stale request that completes late (slow network, retried
-- request, a second tab) cannot clobber newer data. security invoker
-- means this runs as the calling user, so the RLS policies above still
-- apply to the insert/update it performs underneath (defense in depth on
-- top of the auth.uid() = user_id already hardcoded here).
create or replace function public.upsert_user_progress (
  p_xp integer,
  p_unlocked_achievements text[],
  p_last_active_date_key text,
  p_streak_days integer,
  p_best_streak integer,
  p_topic_stats jsonb,
  p_review_queue text[],
  p_theme text,
  p_client_updated_at bigint
) returns public.user_progress language plpgsql security invoker as $$
declare
  result public.user_progress;
begin
  insert into public.user_progress (
    user_id, xp, unlocked_achievements, last_active_date_key,
    streak_days, best_streak, topic_stats, review_queue, theme,
    client_updated_at, updated_at
  )
  values (
    auth.uid(), p_xp, p_unlocked_achievements, p_last_active_date_key,
    p_streak_days, p_best_streak, p_topic_stats, p_review_queue, p_theme,
    p_client_updated_at, now()
  )
  on conflict (user_id) do update set
    xp = excluded.xp,
    unlocked_achievements = excluded.unlocked_achievements,
    last_active_date_key = excluded.last_active_date_key,
    streak_days = excluded.streak_days,
    best_streak = excluded.best_streak,
    topic_stats = excluded.topic_stats,
    review_queue = excluded.review_queue,
    theme = excluded.theme,
    client_updated_at = excluded.client_updated_at,
    updated_at = now()
  where public.user_progress.client_updated_at < excluded.client_updated_at
  returning * into result;

  if result is null then
    -- The where clause above didn't match (our write was stale) -- return
    -- the current authoritative row so the caller can pull it and
    -- reconcile, instead of getting nothing back.
    select * into result from public.user_progress where user_id = auth.uid();
  end if;

  return result;
end;
$$;

grant execute on function public.upsert_user_progress to authenticated;
