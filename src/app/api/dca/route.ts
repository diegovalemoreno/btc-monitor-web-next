import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDcaPlan, upsertDcaPlan } from '@/repositories/dca-plans'
import { getLatestRecommendation } from '@/repositories/dca-recommendations'
import { getCurrentMarketData } from '@/services/market-data'
import { getOrCreateDcaRecommendation } from '@/services/dca'
import type { RiskProfile } from '@/lib/db/types'

const VALID_PROFILES = new Set<RiskProfile>(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'])

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const plan           = await getDcaPlan(supabase, user.id)
  const latestRec      = plan ? await getLatestRecommendation(supabase, user.id) : null

  // If plan exists but no recommendation yet, compute one on the fly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recommendation: any = latestRec
  if (plan && !latestRec) {
    try {
      const { signal, snapshot } = await getCurrentMarketData()
      recommendation = await getOrCreateDcaRecommendation(signal, plan, snapshot?.id ?? null)
    } catch {
      // non-fatal — return plan without recommendation
    }
  }

  return NextResponse.json({ plan, recommendation })
}

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
    monthly_amount_brl,
    risk_profile       = 'MODERATE',
    default_buy_day    = null,
    reserve_percentage = 30,
    enabled            = true,
  } = body

  if (typeof monthly_amount_brl !== 'number' || monthly_amount_brl <= 0) {
    return NextResponse.json({ error: 'monthly_amount_brl must be a positive number' }, { status: 422 })
  }
  if (!VALID_PROFILES.has(risk_profile as RiskProfile)) {
    return NextResponse.json({ error: 'Invalid risk_profile' }, { status: 422 })
  }
  if (
    default_buy_day !== null &&
    (typeof default_buy_day !== 'number' || default_buy_day < 1 || default_buy_day > 28)
  ) {
    return NextResponse.json({ error: 'default_buy_day must be 1–28 or null' }, { status: 422 })
  }
  const reservePct = Number(reserve_percentage)
  if (isNaN(reservePct) || reservePct < 0 || reservePct > 100) {
    return NextResponse.json({ error: 'reserve_percentage must be 0–100' }, { status: 422 })
  }

  const plan = await upsertDcaPlan(supabase, {
    user_id:             user.id,
    monthly_amount_brl:  monthly_amount_brl as number,
    risk_profile:        risk_profile as RiskProfile,
    default_buy_day:     default_buy_day as number | null,
    reserve_percentage:  reservePct,
    enabled:             Boolean(enabled),
  })

  return NextResponse.json({ plan })
}
