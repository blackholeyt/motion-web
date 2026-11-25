-- Motion Web: a fixed access code on top of the open sign-up (docs/DATENSCHUTZ.md, section 5).
--
-- Anyone may create a login, but an account can read or write data only after it redeemed the
-- access code once. Mathis sets the code himself in the SQL Editor:
--
--   select private.set_access_code('your code');
--
-- Only a salted SHA-256 hash is stored, in the schema "private", which the API does not expose.
-- Codes are compared trimmed and in lower case, so "Bankdrücken " and "bankdrücken" both work.
-- Until a code is set, nobody new gets in. Every account that existed before this migration is
-- unlocked automatically.

create schema if not exists private;
revoke all on schema private from public;

create table private.access_code (
  singleton boolean primary key default true check (singleton),
  salt text not null,
  code_hash text not null,
  changed_at timestamptz not null default now()
);

-- Failed attempts, for the lock against guessing. Kept for a day.
create table private.access_attempts (
  user_id uuid not null,
  attempted_at timestamptz not null default clock_timestamp()
);
create index access_attempts_by_time on private.access_attempts (attempted_at);
create index access_attempts_by_user on private.access_attempts (user_id, attempted_at);

create function private.access_code_hash(salt text, code text) returns text
language sql
immutable
set search_path = ''
as $$ select encode(sha256(convert_to(salt || lower(btrim(coalesce(code, ''))), 'UTF8')), 'hex') $$;

create function private.set_access_code(code text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_salt text := replace(gen_random_uuid()::text, '-', '');
begin
  if code is null or length(btrim(code)) < 6 then
    raise exception 'Motion: the access code needs at least 6 characters';
  end if;
  insert into private.access_code (singleton, salt, code_hash, changed_at)
  values (true, new_salt, private.access_code_hash(new_salt, code), now())
  on conflict (singleton) do update set salt = excluded.salt, code_hash = excluded.code_hash, changed_at = excluded.changed_at;
end;
$$;

revoke all on function private.access_code_hash(text, text) from public;
revoke all on function private.set_access_code(text) from public;

-- One row per unlocked account. It leaves with the login (foreign key) and cannot be written by
-- the signed-in role; only redeem_access_code() adds rows.
create table public.access_grants (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default clock_timestamp()
);

alter table public.access_grants enable row level security;
revoke all on table public.access_grants from anon, authenticated;
grant select on table public.access_grants to authenticated;
create policy "own grant: read" on public.access_grants for select to authenticated using ((select auth.uid()) = user_id);

create function public.has_access() returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from public.access_grants where user_id = (select auth.uid())) $$;

revoke all on function public.has_access() from public, anon;
grant execute on function public.has_access() to authenticated;

-- Returns 'ok', 'wrong' or 'locked'. Locked after 10 wrong codes of one account in 15 minutes, or
-- 100 wrong codes of all accounts together in an hour (someone creating many logins to guess).
create function public.redeem_access_code(code text) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  account uuid := auth.uid();
  stored private.access_code%rowtype;
begin
  if account is null then
    raise exception 'Motion: not signed in' using errcode = '28000';
  end if;
  if exists (select 1 from public.access_grants where user_id = account) then
    return 'ok';
  end if;
  delete from private.access_attempts where attempted_at < clock_timestamp() - interval '1 day';
  if (select count(*) from private.access_attempts where user_id = account and attempted_at > clock_timestamp() - interval '15 minutes') >= 10
    or (select count(*) from private.access_attempts where attempted_at > clock_timestamp() - interval '1 hour') >= 100 then
    return 'locked';
  end if;
  select * into stored from private.access_code where singleton;
  if not found or private.access_code_hash(stored.salt, code) <> stored.code_hash then
    insert into private.access_attempts (user_id) values (account);
    return 'wrong';
  end if;
  insert into public.access_grants (user_id) values (account) on conflict do nothing;
  return 'ok';
end;
$$;

revoke all on function public.redeem_access_code(text) from public, anon;
grant execute on function public.redeem_access_code(text) to authenticated;

-- On every data table, in addition to "own rows": nothing without an unlocked account. Restrictive
-- policies are combined with AND, so this narrows the existing rules and never widens them.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'exercises', 'blueprints', 'blueprint_exercises', 'workouts', 'workout_exercises',
    'set_logs', 'training_plans', 'body_weights', 'weight_rewards', 'workout_awards', 'sleep_scores', 'legacy_imports'
  ] loop
    execute format(
      'create policy "access code redeemed" on public.%I as restrictive for all to authenticated using ((select public.has_access())) with check ((select public.has_access()))',
      t
    );
  end loop;
end;
$$;

-- Everyone who had an account before the code existed keeps access.
insert into public.access_grants (user_id) select id from auth.users on conflict do nothing;
