-- Motion Web, phase 6: delete the signed-in account with all its data (docs/DATENSCHUTZ.md, section 3).
--
-- delete_account() runs with the rights of its owner (security definer), so it can remove the login
-- from auth.users. The account is always auth.uid() of the caller, never a parameter, so nobody can
-- delete someone else's account. Rows are removed for real (no tombstones). The function returns
-- how many rows it removed per table, which the app shows and the acceptance test checks.

create function public.delete_account() returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account uuid := auth.uid();
  t text;
  removed integer;
  counts jsonb := '{}';
begin
  if account is null then
    raise exception 'Motion: not signed in' using errcode = '28000';
  end if;
  foreach t in array array[
    'profiles', 'exercises', 'blueprints', 'blueprint_exercises', 'workouts', 'workout_exercises',
    'set_logs', 'training_plans', 'body_weights', 'weight_rewards', 'workout_awards', 'sleep_scores', 'legacy_imports'
  ] loop
    execute format('delete from public.%I where user_id = $1', t) using account;
    get diagnostics removed = row_count;
    counts := counts || jsonb_build_object(t, removed);
  end loop;
  -- Identities, sessions and refresh tokens go with the user (foreign keys in the auth schema).
  delete from auth.users where id = account;
  return counts;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- An access token stays valid for up to an hour after the account is gone. Another device of the
-- deleted account could still upload its queue in that time and bring rows back. The write rule
-- therefore accepts rows only for accounts that still exist. It reads auth.users, which the signed-in
-- role may not, so it now runs with the rights of its owner; it only looks at the row being written.
create or replace function public.motion_accept_write() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from auth.users where id = new.user_id) then
    raise exception 'Motion: account deleted' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' then
    if new.updated_at < old.updated_at then
      return null;
    end if;
    new.created_at := old.created_at;
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;
