import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import type { SupabaseClient } from '@supabase/supabase-js'

/*
 * Test double for the few Supabase calls the app makes (upsert/select on a table, rpc, the
 * session), executed as SQL on an embedded Postgres with the real migrations and RLS. So the tests
 * exercise the real server rules: last change wins, synced_at, and per-account rows.
 */

export const supabaseStubs = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  grant usage on schema auth, public to anon, authenticated;
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;
`

/** All migrations in order. `before` runs right before the first migration whose file name contains its key. */
export async function migratedDatabase(before?: { migration: string; run: (pg: PGlite) => Promise<void> }): Promise<PGlite> {
  const pg = new PGlite()
  await pg.exec(supabaseStubs)
  const folder = join(import.meta.dirname, '..', 'migrations')
  let pending = before
  for (const file of readdirSync(folder).sort()) {
    if (pending && file.includes(pending.migration)) {
      await pending.run(pg)
      pending = undefined
    }
    await pg.exec(readFileSync(join(folder, file), 'utf8'))
  }
  return pg
}

/** Accounts that exist in auth.users and redeemed the access code; the write rule accepts rows only for them. */
export async function addUsers(pg: PGlite, ...ids: string[]) {
  await addUsersWithoutAccess(pg, ...ids)
  for (const id of ids) await pg.query('insert into public.access_grants (user_id) values ($1) on conflict do nothing', [id])
}

/** Logins that have not redeemed the access code yet: Row Level Security gives them nothing. */
export async function addUsersWithoutAccess(pg: PGlite, ...ids: string[]) {
  for (const id of ids) await pg.query('insert into auth.users (id) values ($1) on conflict do nothing', [id])
}

type Result = { data: unknown[] | null; error: Error | null }

/** Values as PostgREST returns them: timestamps with an offset, dates as YYYY-MM-DD. */
function toJSON(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value instanceof Date ? (key === 'day' ? value.toISOString().slice(0, 10) : value.toISOString().replace('Z', '+00:00')) : value]),
  )
}

class Query implements PromiseLike<Result> {
  private rows: Record<string, unknown>[] | null = null
  private filters: string[] = []
  private params: unknown[] = []
  private ordering: string[] = []
  private max: number | null = null

  constructor(
    private pg: PGlite,
    private table: string,
    private user: () => string | null,
  ) {}

  upsert(rows: Record<string, unknown>[]) {
    this.rows = rows
    return this
  }
  select() {
    return this
  }
  gte(column: string, value: unknown) {
    this.params.push(value)
    this.filters.push(`${column} >= $${this.params.length}`)
    return this
  }
  in(column: string, values: unknown[]) {
    this.params.push(values)
    this.filters.push(`${column} = any($${this.params.length}::uuid[])`)
    return this
  }
  order(column: string) {
    this.ordering.push(column)
    return this
  }
  limit(count: number) {
    this.max = count
    return this
  }

  private async run(): Promise<Result> {
    const user = this.user()
    await this.pg.exec(`set role authenticated; set request.jwt.claims = '${JSON.stringify({ sub: user, role: 'authenticated' })}'`)
    try {
      if (this.rows) {
        const returned: unknown[] = []
        for (const row of this.rows) {
          const keys = Object.keys(row)
          const values = keys.map((key) => (row[key] !== null && typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]))
          const sql = `insert into public.${this.table} (${keys.join(', ')}) values (${keys.map((_, index) => `$${index + 1}`).join(', ')})
            on conflict (user_id, id) do update set ${keys.map((key) => `${key} = excluded.${key}`).join(', ')} returning id`
          returned.push(...(await this.pg.query(sql, values)).rows)
        }
        return { data: returned, error: null }
      }
      const where = this.filters.length ? ` where ${this.filters.join(' and ')}` : ''
      const order = this.ordering.length ? ` order by ${this.ordering.join(', ')}` : ''
      const limit = this.max ? ` limit ${this.max}` : ''
      const result = await this.pg.query<Record<string, unknown>>(`select * from public.${this.table}${where}${order}${limit}`, this.params)
      return { data: result.rows.map(toJSON), error: null }
    } catch (error) {
      return { data: null, error: error as Error }
    } finally {
      await this.pg.exec('reset role; reset request.jwt.claims')
    }
  }

  then<A = Result, B = never>(resolve?: ((value: Result) => A | PromiseLike<A>) | null, reject?: ((reason: unknown) => B | PromiseLike<B>) | null) {
    return this.run().then(resolve, reject)
  }
}

/** A Supabase client for one device; `as` switches the signed-in account. */
export function pgSupabase(pg: PGlite, user: string | null) {
  let current = user
  const client = {
    auth: { getSession: async () => ({ data: { session: current ? { user: { id: current } } : null }, error: null }) },
    from: (table: string) => new Query(pg, table, () => current),
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      await pg.exec(`set role authenticated; set request.jwt.claims = '${JSON.stringify({ sub: current, role: 'authenticated' })}'`)
      try {
        const keys = Object.keys(args)
        const named = keys.map((key, index) => `${key} => $${index + 1}`).join(', ')
        const result = await pg.query<{ result: unknown }>(`select public.${name}(${named}) as result`, keys.map((key) => args[key]))
        return { data: result.rows[0]!.result, error: null }
      } catch (error) {
        return { data: null, error: error as Error }
      } finally {
        await pg.exec('reset role; reset request.jwt.claims')
      }
    },
    as: (next: string | null) => {
      current = next
    },
  }
  return client as unknown as SupabaseClient & { as: (next: string | null) => void }
}
