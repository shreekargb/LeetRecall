import 'server-only'
import { createClient } from '@supabase/supabase-js'

// For authenticated server-side AI jobs only. Never import into client components.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server AI storage is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
