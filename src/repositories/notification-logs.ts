import { SupabaseClient } from '@supabase/supabase-js'
import type { InsertNotificationLog, NotificationLogRow } from '@/lib/db/types'

export async function insertNotificationLog(
  client: SupabaseClient,
  log: InsertNotificationLog
): Promise<void> {
  const { error } = await client.from('notification_logs').insert(log)
  if (error) console.error('[notification_logs] insert failed:', error.message)
}

export async function insertNotificationLogs(
  client: SupabaseClient,
  logs: InsertNotificationLog[]
): Promise<void> {
  if (!logs.length) return
  const { error } = await client.from('notification_logs').insert(logs)
  if (error) console.error('[notification_logs] bulk insert failed:', error.message)
}

export async function getRecentLogs(
  client: SupabaseClient,
  userId: string,
  limit = 50
): Promise<NotificationLogRow[]> {
  const { data, error } = await client
    .from('notification_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data as NotificationLogRow[]
}
