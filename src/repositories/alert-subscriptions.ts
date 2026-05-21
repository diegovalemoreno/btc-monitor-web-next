import { SupabaseClient } from '@supabase/supabase-js'
import type { AlertSubscriptionRow, UpsertAlertSubscription } from '@/lib/db/types'

export async function getSubscription(
  client: SupabaseClient,
  userId: string
): Promise<AlertSubscriptionRow | null> {
  const { data, error } = await client
    .from('alert_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data as AlertSubscriptionRow
}

export async function upsertSubscription(
  client: SupabaseClient,
  sub: UpsertAlertSubscription
): Promise<AlertSubscriptionRow> {
  const { data, error } = await client
    .from('alert_subscriptions')
    .upsert({ ...sub, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) throw new Error(`upsertSubscription: ${error.message}`)
  return data as AlertSubscriptionRow
}
