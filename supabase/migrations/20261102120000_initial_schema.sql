-- Motion Web, phase 4: cloud schema for the local-first sync (docs/DATENMODELL.md, section 2).
--
-- Every synced table shares five columns: id (made on the device), user_id, created_at, updated_at,
-- deleted_at (soft delete). The primary key is (user_id, id), so a record id chosen by one account
-- can never touch another account's row. Daily and single records use ids derived from their day
-- or kind (UUIDv5), so two devices writing the same day merge into one row instead of duplicating.
--
-- synced_at is set by the server on every accepted write. Devices pull "everything after my last
-- synced_at", which also catches records that another device uploaded late after being offline.
--
-- There are no foreign keys on purpose: devices upload in any order and keep tombstones.

create table public.profiles (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  name text not null,
  body_weight_unit text not null,
  load_unit text not null,
  distance_unit text not null,
  target_weight_kg double precision,
  celebrated_weight_goals jsonb not null default '[]',
  body_weight_goal text not null,
  preferences jsonb not null default '{}',
  primary key (user_id, id)
);

create table public.exercises (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  name text not null,
  goal_weight_kg double precision,
  is_pr_tracked boolean not null,
  rest_seconds double precision,
  catalogue_id text,
  equipment text not null,
  muscle text not null,
  measurement text not null,
  guidance text not null,
  track_progress boolean not null,
  primary key (user_id, id)
);

create table public.blueprints (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  name text not null,
  cardio_type text,
  cardio_minutes double precision,
  cardio_distance_km double precision,
  primary key (user_id, id)
);

create table public.blueprint_exercises (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  blueprint_id uuid not null,
  exercise_id uuid not null,
  sort_order integer not null,
  target_sets integer not null,
  warm_up_sets integer not null,
  superset_group text,
  guidance jsonb,
  primary key (user_id, id)
);

create table public.workouts (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  name text not null,
  performed_at timestamptz not null,
  is_completed boolean not null,
  is_freestyle boolean not null,
  is_retrospective boolean not null,
  blueprint_id uuid,
  notes text,
  earned_xp integer not null default 0,
  draft_updated_at timestamptz,
  plan_ticket jsonb,
  rest_timer jsonb,
  undo_history jsonb,
  cardio_type text,
  cardio_seconds double precision,
  cardio_distance_km double precision,
  cardio_pace_s_per_km double precision,
  source text not null default 'motion',
  legacy_health jsonb,
  primary key (user_id, id)
);

create table public.workout_exercises (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  workout_id uuid not null,
  exercise_id uuid,
  exercise_name text not null,
  measurement text not null,
  guidance jsonb,
  superset_group text,
  rest_seconds double precision,
  acknowledged_record_kg double precision,
  is_history_only boolean not null,
  is_removed boolean not null,
  sort_order integer not null,
  primary key (user_id, id)
);

create table public.set_logs (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  workout_id uuid not null,
  workout_exercise_id uuid not null,
  set_index integer not null,
  weight_kg double precision not null,
  reps double precision,
  duration_seconds double precision,
  is_completed boolean not null,
  is_warm_up boolean not null,
  is_skipped boolean not null,
  is_removed boolean not null,
  draft_weight_text text,
  draft_weight_unit text,
  draft_reps_text text,
  draft_duration_text text,
  primary key (user_id, id)
);

create table public.training_plans (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  schedule jsonb not null,
  primary key (user_id, id)
);

create table public.body_weights (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  day date not null,
  recorded_at timestamptz not null,
  kilograms double precision not null,
  primary key (user_id, id)
);

create table public.weight_rewards (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  day date not null,
  awarded_at timestamptz not null,
  earned_xp integer not null,
  primary key (user_id, id)
);

create table public.workout_awards (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  workout_id uuid not null,
  earned_xp integer not null,
  primary key (user_id, id)
);

create table public.sleep_scores (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  day date not null,
  score integer not null,
  primary key (user_id, id)
);

-- Last change wins: an upload older than the stored row is skipped silently, so a device that was
-- offline for a week cannot overwrite newer edits. Every accepted write gets a fresh synced_at.
create function public.motion_accept_write() returns trigger
language plpgsql
set search_path = ''
as $$
begin
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

-- Row Level Security on every table: each row is visible and changeable only for its own account.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'exercises', 'blueprints', 'blueprint_exercises', 'workouts', 'workout_exercises',
    'set_logs', 'training_plans', 'body_weights', 'weight_rewards', 'workout_awards', 'sleep_scores'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('create policy "own rows: read" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: insert" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: update" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "own rows: delete" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create trigger accept_write before insert or update on public.%I for each row execute function public.motion_accept_write()', t);
    execute format('create index %I on public.%I (user_id, synced_at)', t || '_pull', t);
  end loop;
end;
$$;

-- Daily keep-alive for the free plan (.github/workflows/keep-alive.yml). Reads no user data.
create function public.keep_alive() returns text
language sql
stable
set search_path = ''
as $$ select 'ok'::text $$;

revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
