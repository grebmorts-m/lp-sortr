import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
// Supabase's publishable key (sb_publishable_…); the legacy anon key name still works.
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY) as
  | string
  | undefined

/** Null when not configured; the app then only offers guest mode. */
export const supabase = url && key ? createClient(url, key) : null
