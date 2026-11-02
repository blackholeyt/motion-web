import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/*
 * The only Supabase connection. Built from the public project URL and the publishable key, which
 * are safe in the frontend because Row Level Security decides what each account may read and write.
 * Without both values (for example before the cloud is set up) the app stays a guest-only app.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const cloudConfigured = Boolean(url && key)

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (client) return client
  if (!cloudConfigured) throw new Error('The cloud is not set up for this version of Motion.')
  client = createClient(url!, key!, {
    auth: {
      // PKCE keeps the Google sign-in inside the installed iPhone app's own storage.
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'motion.auth',
    },
  })
  return client
}

/** Tests replace the connection with a fake. */
export function setSupabase(next: SupabaseClient | null) {
  client = next
}
