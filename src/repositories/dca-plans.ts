import { SupabaseClient } from '@supabase/supabase-js'
import type { DcaPlanRow, UpsertDcaPlan } from '@/lib/db/types'

export async function getDcaPlan(
  client: SupabaseClient,
  userId: string
): Promise<DcaPlanRow | null> {
  const { data, error } = await client
    .from('dca_plans')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data as DcaPlanRow
}

export async function upsertDcaPlan(
  client: SupabaseClient,
  plan: UpsertDcaPlan
): Promise<DcaPlanRow> {
  const { data, error } = await client
    .from('dca_plans')
    .upsert({ ...plan, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw new Error(`upsertDcaPlan: ${error.message}`)
  return data as DcaPlanRow
}
