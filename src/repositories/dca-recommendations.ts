import { SupabaseClient } from '@supabase/supabase-js'
import type { DcaRecommendationRow, InsertDcaRecommendation } from '@/lib/db/types'

export async function insertDcaRecommendation(
  client: SupabaseClient,
  rec: InsertDcaRecommendation
): Promise<DcaRecommendationRow> {
  const { data, error } = await client
    .from('dca_recommendations')
    .insert(rec)
    .select()
    .single()

  if (error) throw new Error(`insertDcaRecommendation: ${error.message}`)
  return data as DcaRecommendationRow
}

export async function insertDcaRecommendations(
  client: SupabaseClient,
  recs: InsertDcaRecommendation[]
): Promise<DcaRecommendationRow[]> {
  if (!recs.length) return []
  const { data, error } = await client
    .from('dca_recommendations')
    .insert(recs)
    .select()

  if (error) throw new Error(`insertDcaRecommendations: ${error.message}`)
  return data as DcaRecommendationRow[]
}

export async function getLatestRecommendation(
  client: SupabaseClient,
  userId: string
): Promise<DcaRecommendationRow | null> {
  const { data, error } = await client
    .from('dca_recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return null
  return data as DcaRecommendationRow
}

export async function getRecentRecommendations(
  client: SupabaseClient,
  userId: string,
  limit = 10
): Promise<DcaRecommendationRow[]> {
  const { data, error } = await client
    .from('dca_recommendations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data as DcaRecommendationRow[]
}
