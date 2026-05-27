import { describe, it, expect } from 'vitest'
import {
  colorForReturn,
  textColorForReturn,
  buildContributionPoints,
  buildHeatmapCells,
  computeInsights,
  computePatrimonio,
} from '../compute'
import type { DcaContributionRow } from '@/lib/db/types'

function makeContribution(overrides: Partial<DcaContributionRow> = {}): DcaContributionRow {
  return {
    id: '1',
    user_id: 'u1',
    amount: 1000,
    contribution_date: '2023-06-15',
    contribution_type: 'STRUCTURAL_DCA',
    market_score_snapshot: null,
    market_state_snapshot: null,
    notes: null,
    sats_purchased: 200_000,        // 0.002 BTC
    btc_price_brl: 150_000,         // bought at R$150k
    effective_price_brl: 150_000,
    created_at: '2023-06-15T00:00:00Z',
    updated_at: '2023-06-15T00:00:00Z',
    deleted_at: null,
    ...overrides,
  }
}

describe('colorForReturn', () => {
  it('returns dark red for negative return', () => {
    expect(colorForReturn(-10)).toBe('#7f1d1d')
  })
  it('returns medium red for small negative', () => {
    expect(colorForReturn(-2)).toBe('#991b1b')
  })
  it('returns dark green for small positive', () => {
    expect(colorForReturn(10)).toBe('#166534')
  })
  it('returns bright green for large positive', () => {
    expect(colorForReturn(200)).toBe('#dcfce7')
  })
})

describe('textColorForReturn', () => {
  it('returns white for dark cells (low return)', () => {
    expect(textColorForReturn(50)).toBe('rgba(255,255,255,0.85)')
  })
  it('returns dark for bright cells (high return)', () => {
    expect(textColorForReturn(150)).toBe('rgba(0,0,0,0.75)')
  })
})

describe('buildContributionPoints', () => {
  it('computes returnPct relative to currentBtcPrice', () => {
    const c = makeContribution({ btc_price_brl: 200_000 })
    const points = buildContributionPoints([c], 300_000)
    expect(points).toHaveLength(1)
    expect(points[0].returnPct).toBeCloseTo(50)  // (300k-200k)/200k*100
  })

  it('excludes contributions with zero sats', () => {
    const c = makeContribution({ sats_purchased: 0 })
    expect(buildContributionPoints([c], 300_000)).toHaveLength(0)
  })

  it('excludes Venda notes', () => {
    const c = makeContribution({ notes: 'Venda parcial' })
    expect(buildContributionPoints([c], 300_000)).toHaveLength(0)
  })

  it('falls back to effective_price_brl when btc_price_brl is null', () => {
    const c = makeContribution({ btc_price_brl: null, effective_price_brl: 100_000 })
    const points = buildContributionPoints([c], 200_000)
    expect(points[0].returnPct).toBeCloseTo(100)
  })

  it('computes btcAmount from sats_purchased', () => {
    const c = makeContribution({ sats_purchased: 1_000_000 })
    const points = buildContributionPoints([c], 300_000)
    expect(points[0].btcAmount).toBeCloseTo(0.01)
  })
})

describe('buildHeatmapCells', () => {
  it('extracts year and month from contribution_date', () => {
    const c = makeContribution({ contribution_date: '2023-06-15' })
    const cells = buildHeatmapCells([c], 300_000)
    expect(cells[0].year).toBe(2023)
    expect(cells[0].month).toBe(6)
  })
})

describe('computeInsights', () => {
  it('identifies best and worst contribution', () => {
    const good = makeContribution({ id: '1', btc_price_brl: 100_000, contribution_date: '2023-01-01' })
    const bad  = makeContribution({ id: '2', btc_price_brl: 500_000, contribution_date: '2022-01-01' })
    const insights = computeInsights([good, bad], 300_000)
    expect(insights.bestContribution.returnPct).toBeCloseTo(200)
    expect(insights.worstContribution.returnPct).toBeCloseTo(-40)
  })

  it('counts profitable contributions', () => {
    const good = makeContribution({ id: '1', btc_price_brl: 100_000 })
    const bad  = makeContribution({ id: '2', btc_price_brl: 500_000 })
    const insights = computeInsights([good, bad], 300_000)
    expect(insights.profitableCount).toBe(1)
    expect(insights.totalCount).toBe(2)
  })

  it('returns null dcaVsLumpSumPct for single contribution', () => {
    const c = makeContribution()
    const insights = computeInsights([c], 300_000)
    expect(insights.dcaVsLumpSumPct).toBeNull()
  })
})

describe('computePatrimonio', () => {
  it('computes currentValue as totalBtc * currentBtcPrice', () => {
    const c = makeContribution({ sats_purchased: 1_000_000 })  // 0.01 BTC
    const data = computePatrimonio([c], [], 500_000)
    expect(data.currentValue).toBeCloseTo(5_000)    // 0.01 * 500k
    expect(data.totalBtc).toBeCloseTo(0.01)
  })

  it('computes avgPrice as totalInvested / totalBtc', () => {
    const c = makeContribution({ amount: 1000, sats_purchased: 200_000 })  // 0.002 BTC
    const data = computePatrimonio([c], [], 300_000)
    expect(data.avgPrice).toBeCloseTo(500_000)  // 1000 / 0.002
  })

  it('computes totalReturn percentage', () => {
    const c = makeContribution({ amount: 1000, sats_purchased: 200_000, btc_price_brl: 150_000 })
    const data = computePatrimonio([c], [], 300_000)
    // currentValue = 0.002 * 300k = 600; invested = 1000; return = (600-1000)/1000*100 = -40%
    expect(data.totalReturn).toBeCloseTo(-40)
  })
})
