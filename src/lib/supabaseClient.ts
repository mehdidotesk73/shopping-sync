import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Null when the env vars aren't set (local dev without a .env, or a deploy that hasn't
 * configured them yet) — callers must treat sharing as unavailable rather than crashing.
 */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
