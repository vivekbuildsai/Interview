-- Postgres grants EXECUTE on a newly created function to PUBLIC by
-- default -- the original migration's `grant ... to authenticated` was
-- additive, not exclusive, so anon (and literally any role) could also
-- call upsert_user_progress(). Verified harmless in practice (RLS's
-- with-check and user_id's NOT NULL constraint already reject an anon
-- call, since auth.uid() is null for one), but least-privilege says this
-- should never have been reachable at all, and a future change to the
-- function shouldn't have to rely on that second line of defense alone.
revoke execute on function public.upsert_user_progress
from
  public;
