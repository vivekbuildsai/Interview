-- Revoking from PUBLIC (0002) didn't fully close this: Supabase's own
-- project-level default privileges grant anon and authenticated EXECUTE
-- on every new function in public separately from PUBLIC, so anon kept
-- access. This app never calls upsert_user_progress() while
-- unauthenticated (see src/lib/cloud/useCloudSync.ts -- it only runs
-- once status === "authenticated"), so anon never needs it. Verified
-- live before this migration that an anon call is already rejected by
-- RLS regardless; this closes the privilege gap itself rather than
-- relying on that second line of defense alone.
revoke execute on function public.upsert_user_progress
from
  anon;
