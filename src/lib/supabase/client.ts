// Thin wrapper around the Supabase client, kept in its own module so
// nothing else needs to know how configuration is sourced or what happens
// when it's missing. The URL and anon key are both meant to be public
// (anon key access is restricted entirely by Postgres RLS, not secrecy) --
// see .env.example. A service-role/secret key must never appear here or
// anywhere else in this frontend-only app.

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)
}

// Cloud auth/sync features degrade to "unavailable" rather than crashing
// the app when no Supabase project has been connected yet -- guest mode
// and all existing local gameplay must keep working regardless.
export const supabase: SupabaseClient | null = isSupabaseConfigured() ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null
