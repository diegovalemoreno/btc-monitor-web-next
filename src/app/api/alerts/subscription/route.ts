import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubscription, upsertSubscription } from '@/repositories/alert-subscriptions'
import type { RiskProfile, Severity } from '@/lib/db/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subscription = await getSubscription(supabase, user.id)
  return NextResponse.json({ subscription })
}

const VALID_PROFILES  = new Set<RiskProfile>(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'])
const VALID_SEVERITIES = new Set<Severity>(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    profile          = 'MODERATE',
    enabled          = true,
    telegram_enabled = false,
    telegram_chat_id = null,
    email_enabled    = true,
    min_severity     = 'MEDIUM',
  } = body

  if (!VALID_PROFILES.has(profile as RiskProfile)) {
    return NextResponse.json({ error: 'Invalid profile' }, { status: 422 })
  }
  if (!VALID_SEVERITIES.has(min_severity as Severity)) {
    return NextResponse.json({ error: 'Invalid min_severity' }, { status: 422 })
  }

  const subscription = await upsertSubscription(supabase, {
    user_id:          user.id,
    profile:          profile as RiskProfile,
    enabled:          Boolean(enabled),
    telegram_enabled: Boolean(telegram_enabled),
    telegram_chat_id: typeof telegram_chat_id === 'string' ? telegram_chat_id : null,
    email_enabled:    Boolean(email_enabled),
    min_severity:     min_severity as Severity,
  })

  return NextResponse.json({ subscription })
}
