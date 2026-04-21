import { createClient } from '@supabase/supabase-js'

/*
 * Server-side Supabase client for API routes.
 * Uses NEXT_PUBLIC_ env vars (same key, works server-side too).
 * No service-role key needed — anon key is fine since RLS allows
 * anon inserts/selects on grid_readings.
 */
const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseServer = createClient(supabaseUrl, supabaseAnon)
