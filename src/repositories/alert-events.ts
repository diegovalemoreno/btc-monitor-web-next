import { SupabaseClient } from '@supabase/supabase-js'
import type { AlertEventRow, InsertAlertEvent } from '@/lib/db/types'

export async function getRecentAlerts(
  client: SupabaseClient,
  userId: string,
  limit = 20
): Promise<AlertEventRow[]> {
  const { data, error } = await client
    .from('alert_events')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data as AlertEventRow[]
}

export async function insertAlertEvent(
  client: SupabaseClient,
  event: InsertAlertEvent
): Promise<AlertEventRow> {
  const { data, error } = await client
    .from('alert_events')
    .insert(event)
    .select()
    .single()

  if (error) throw new Error(`insertAlertEvent: ${error.message}`)
  return data as AlertEventRow
}
