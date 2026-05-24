import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listDcaContributions, insertDcaContribution } from '@/repositories/dca-contributions'
import type { ContributionType, MarketStateSnapshot } from '@/lib/db/types'

const VALID_TYPES = new Set<ContributionType>(['STRUCTURAL_DCA', 'TACTICAL', 'MANUAL'])
const VALID_STATES = new Set<MarketStateSnapshot>(['DEFENSIVE', 'NEUTRAL', 'FAVORABLE', 'AGGRESSIVE'])

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(200, parseInt(searchParams.get('limit') ?? '50', 10))

  const contributions = await listDcaContributions(supabase, user.id, limit)
  return NextResponse.json({ contributions })
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
    amount,
    contribution_date,
    contribution_type = 'TACTICAL',
    market_score_snapshot = null,
    market_state_snapshot = null,
    notes = null,
  } = body

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 422 })
  }
  if (typeof contribution_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(contribution_date)) {
    return NextResponse.json({ error: 'contribution_date must be YYYY-MM-DD' }, { status: 422 })
  }
  if (!VALID_TYPES.has(contribution_type as ContributionType)) {
    return NextResponse.json({ error: 'Invalid contribution_type' }, { status: 422 })
  }
  if (market_state_snapshot !== null && !VALID_STATES.has(market_state_snapshot as MarketStateSnapshot)) {
    return NextResponse.json({ error: 'Invalid market_state_snapshot' }, { status: 422 })
  }
  if (market_score_snapshot !== null && (typeof market_score_snapshot !== 'number' || market_score_snapshot < 0 || market_score_snapshot > 100)) {
    return NextResponse.json({ error: 'market_score_snapshot must be 0–100' }, { status: 422 })
  }

  const contribution = await insertDcaContribution(supabase, {
    user_id:               user.id,
    amount:                amount as number,
    contribution_date:     contribution_date as string,
    contribution_type:     contribution_type as ContributionType,
    market_score_snapshot: market_score_snapshot as number | null,
    market_state_snapshot: market_state_snapshot as MarketStateSnapshot | null,
    notes:                 notes as string | null,
  })

  return NextResponse.json({ contribution }, { status: 201 })
}
