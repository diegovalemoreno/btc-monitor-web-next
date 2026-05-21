import { SupabaseClient } from '@supabase/supabase-js'
import type { InsertMarketSnapshot, MarketSnapshotRow } from '@/lib/db/types'

export async function getLatestSnapshot(
  client: SupabaseClient
): Promise<MarketSnapshotRow | null> {
  const { data, error } = await client
    .from('market_snapshots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data as MarketSnapshotRow
}

export async function insertSnapshot(
  client: SupabaseClient,
  snapshot: InsertMarketSnapshot
): Promise<MarketSnapshotRow> {
  const { data, error } = await client
    .from('market_snapshots')
    .insert(snapshot)
    .select()
    .single()

  if (error) throw new Error(`insertSnapshot: ${error.message}`)
  return data as MarketSnapshotRow
}
