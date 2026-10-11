-- Study plans are a personal preference/schedule, not an earned or
-- cumulative value (same category as theme), so they get one nullable
-- JSONB column on the existing one-row-per-user document table rather
-- than a new normalized table -- there's exactly one active plan per
-- user, matching how topic_stats/review_queue are already stored
-- directly as columns here instead of in their own tables.
alter table public.user_progress
add column if not exists study_plan jsonb;

-- Extends the existing stale-write-guarded upsert to also carry the
-- study plan, with the same security-invoker + client_updated_at
-- protection as every other field -- not a separate write path that
-- could race with or bypass that guard.
--
-- A new trailing parameter changes the function's signature, so
-- `create or replace` would create a second overload instead of
-- replacing the original (and then fail ambiguously on the revoke
-- below) -- drop the exact old signature first so there's only ever
-- one version of this function.
drop function if exists public.upsert_user_progress (
  integer, text[], text, integer, integer, jsonb, text[], text, bigint
);

create or replace function public.upsert_user_progress (
  p_xp integer,
  p_unlocked_achievements text[],
  p_last_active_date_key text,
  p_streak_days integer,
  p_best_streak integer,
  p_topic_stats jsonb,
  p_review_queue text[],
  p_theme text,
  p_client_updated_at bigint,
  p_study_plan jsonb default null
) returns public.user_progress language plpgsql security invoker as $$
declare
  result public.user_progress;
begin
  insert into public.user_progress (
    user_id, xp, unlocked_achievements, last_active_date_key,
    streak_days, best_streak, topic_stats, review_queue, theme,
    client_updated_at, study_plan, updated_at
  )
  values (
    auth.uid(), p_xp, p_unlocked_achievements, p_last_active_date_key,
    p_streak_days, p_best_streak, p_topic_stats, p_review_queue, p_theme,
    p_client_updated_at, p_study_plan, now()
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
    study_plan = excluded.study_plan,
    updated_at = now()
  where public.user_progress.client_updated_at < excluded.client_updated_at
  returning * into result;

  if result is null then
    select * into result from public.user_progress where user_id = auth.uid();
  end if;

  return result;
end;
$$;

revoke execute on function public.upsert_user_progress from public, anon;
grant execute on function public.upsert_user_progress to authenticated;
