// ================================================================
// services/notification.ts
// Dispatches a single alert_event to all enabled channels.
// Logs every attempt (success or failure) to notification_logs.
// Uses service role — must only be called server-side.
// ================================================================

import { getServiceClient } from '@/lib/supabase/service'
import { sendTelegramAlert } from './telegram'
import { sendEmailAlert } from './email'
import { insertNotificationLogs } from '@/repositories/notification-logs'
import type { AlertEventRow, AlertSubscriptionRow, InsertNotificationLog } from '@/lib/db/types'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://btcmonitor.app'

interface NotificationParams {
  event:        AlertEventRow
  subscription: AlertSubscriptionRow
  userEmail:    string
}

export async function dispatchAlertNotification({
  event,
  subscription,
  userEmail,
}: NotificationParams): Promise<void> {
  const client  = getServiceClient()
  const logs:    InsertNotificationLog[] = []
  const ctx      = (event.context ?? {}) as Record<string, unknown>
  const sentAt   = new Date().toISOString()

  const sharedParams = {
    title:            event.title,
    message:          event.message,
    severity:         event.severity,
    regime:           typeof ctx.regime === 'string' ? ctx.regime : '',
    opportunityScore: typeof ctx.opportunityScore === 'number' ? ctx.opportunityScore : 0,
    riskScore:        typeof ctx.riskScore === 'number' ? ctx.riskScore : 0,
    convictionScore:  typeof ctx.convictionScore === 'number' ? ctx.convictionScore : 0,
    appUrl:           APP_URL,
  }

  // ── Telegram ─────────────────────────────────────────────────
  if (subscription.telegram_enabled && subscription.telegram_chat_id) {
    const result = await sendTelegramAlert(subscription.telegram_chat_id, sharedParams)
    if (result.ok) {
      console.log('[notification] telegram sent', { userId: event.user_id, eventId: event.id, chatId: subscription.telegram_chat_id })
    } else {
      console.error('[notification] telegram failed', { userId: event.user_id, eventId: event.id, error: result.error })
    }
    logs.push({
      user_id:        event.user_id,
      alert_event_id: event.id,
      channel:        'telegram',
      status:         result.ok ? 'sent' : 'failed',
      error_message:  result.ok ? null : result.error,
      sent_at:        result.ok ? sentAt : null,
    })
  } else {
    console.warn('[notification] telegram skipped', {
      userId:          event.user_id,
      telegram_enabled: subscription.telegram_enabled,
      has_chat_id:      Boolean(subscription.telegram_chat_id),
    })
  }

  // ── Email ─────────────────────────────────────────────────────
  if (subscription.email_enabled && userEmail) {
    const result = await sendEmailAlert(userEmail, sharedParams)
    if (result.ok) {
      console.log('[notification] email sent', { userId: event.user_id, eventId: event.id })
    } else {
      console.error('[notification] email failed', { userId: event.user_id, eventId: event.id, error: result.error })
    }
    logs.push({
      user_id:        event.user_id,
      alert_event_id: event.id,
      channel:        'email',
      status:         result.ok ? 'sent' : 'failed',
      error_message:  result.ok ? null : result.error,
      sent_at:        result.ok ? sentAt : null,
    })
  } else {
    console.warn('[notification] email skipped', {
      userId:        event.user_id,
      email_enabled: subscription.email_enabled,
      has_email:     Boolean(userEmail),
    })
  }

  await insertNotificationLogs(client, logs)
}

// Bulk dispatch for all events created in one cron run.
// Fetches user emails from Supabase Auth admin API.
export async function dispatchBulkAlerts(
  events:        AlertEventRow[],
  subscriptions: AlertSubscriptionRow[]
): Promise<void> {
  if (!events.length) return

  const client = getServiceClient()

  // Build subscription lookup
  const subByUser = new Map(subscriptions.map((s) => [s.user_id, s]))

  // Fetch emails for all affected users in one batch
  const userIds   = [...new Set(events.map((e) => e.user_id))]
  const emailMap  = new Map<string, string>()

  await Promise.all(
    userIds.map(async (uid) => {
      const { data } = await client.auth.admin.getUserById(uid)
      if (data.user?.email) emailMap.set(uid, data.user.email)
    })
  )

  // Dispatch each event independently — failures are logged, not thrown
  await Promise.allSettled(
    events.map(async (event) => {
      const subscription = subByUser.get(event.user_id)
      const userEmail    = emailMap.get(event.user_id)
      if (!subscription) {
        console.warn('[notification] no subscription for user', event.user_id)
        return
      }
      if (!userEmail) {
        console.warn('[notification] no email found for user', event.user_id)
        return
      }

      try {
        await dispatchAlertNotification({ event, subscription, userEmail })
      } catch (err) {
        console.error('[notification] dispatch failed for user', event.user_id, err)
      }
    })
  )
}
