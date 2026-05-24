import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateDcaContribution, softDeleteDcaContribution } from '@/repositories/dca-contributions'
import type { ContributionType } from '@/lib/db/types'

const VALID_TYPES = new Set<ContributionType>(['STRUCTURAL_DCA', 'TACTICAL', 'MANUAL'])

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}

  if ('amount' in body) {
    if (typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 422 })
    }
    patch.amount = body.amount
  }
  if ('contribution_date' in body) {
    if (typeof body.contribution_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.contribution_date)) {
      return NextResponse.json({ error: 'contribution_date must be YYYY-MM-DD' }, { status: 422 })
    }
    patch.contribution_date = body.contribution_date
  }
  if ('contribution_type' in body) {
    if (!VALID_TYPES.has(body.contribution_type as ContributionType)) {
      return NextResponse.json({ error: 'Invalid contribution_type' }, { status: 422 })
    }
    patch.contribution_type = body.contribution_type
  }
  if ('notes' in body) {
    patch.notes = body.notes ?? null
  }
  if ('sats_purchased' in body) {
    const v = body.sats_purchased
    if (v !== null && (typeof v !== 'number' || v <= 0 || !Number.isInteger(v))) {
      return NextResponse.json({ error: 'sats_purchased must be a positive integer or null' }, { status: 422 })
    }
    patch.sats_purchased = (v as number | null) ?? null
  }
  if ('btc_price_brl' in body) {
    const v = body.btc_price_brl
    if (v !== null && (typeof v !== 'number' || v <= 0)) {
      return NextResponse.json({ error: 'btc_price_brl must be a positive number or null' }, { status: 422 })
    }
    patch.btc_price_brl = (v as number | null) ?? null
  }
  if ('effective_price_brl' in body) {
    const v = body.effective_price_brl
    if (v !== null && (typeof v !== 'number' || v <= 0)) {
      return NextResponse.json({ error: 'effective_price_brl must be a positive number or null' }, { status: 422 })
    }
    patch.effective_price_brl = (v as number | null) ?? null
  }

  try {
    const contribution = await updateDcaContribution(supabase, id, user.id, patch)
    return NextResponse.json({ contribution })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  try {
    await softDeleteDcaContribution(supabase, id, user.id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
