import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Service role client — bypasses RLS. NEVER import in client components.
// Only used in Route Handlers and cron jobs.

let _client: SupabaseClient | null = null

export function getServiceClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Missing Supabase service role env vars')

    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _client
}
