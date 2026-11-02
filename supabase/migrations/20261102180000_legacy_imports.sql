-- Motion Web, phase 5a: receipts of imported iOS backups (docs/IMPORT.md, section 4).
--
-- One row per imported file. The id derives from the file's fingerprint (SHA-256 of the backup with
-- sorted keys), so importing the same backup on two devices ends in one row, and a device that
-- imports it again can point that out. Same columns, write rule and Row Level Security as the
-- tables of the initial schema.

create table public.legacy_imports (
  id uuid not null,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  synced_at timestamptz not null default clock_timestamp(),
  fingerprint text not null,
  file_name text not null,
  source_format text not null,
  exported_at timestamptz not null,
  imported_at timestamptz not null,
  counts jsonb not null default '{}',
  primary key (user_id, id)
);

alter table public.legacy_imports enable row level security;
revoke all on table public.legacy_imports from anon;
grant select, insert, update, delete on table public.legacy_imports to authenticated;
create policy "own rows: read" on public.legacy_imports for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows: insert" on public.legacy_imports for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows: update" on public.legacy_imports for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows: delete" on public.legacy_imports for delete to authenticated using ((select auth.uid()) = user_id);
create trigger accept_write before insert or update on public.legacy_imports for each row execute function public.motion_accept_write();
create index legacy_imports_pull on public.legacy_imports (user_id, synced_at);
