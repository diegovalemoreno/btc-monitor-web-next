import { describe, it, expect } from 'vitest'
import { getHistoricalReturns } from '../historical-returns'

describe('getHistoricalReturns', () => {
  it('returns 6 rows', () => {
    expect(getHistoricalReturns(50)).toHaveLength(6)
  })

  it('score 15 marks row 0-20 as current', () => {
    const rows = getHistoricalReturns(15)
    const current = rows.find(r => r.isCurrent)
    expect(current?.scoreRange).toBe('0–20')
    expect(current?.return12m).toBe(190)
  })

  it('score 60 marks row 55-70 as current', () => {
    const rows = getHistoricalReturns(60)
    const current = rows.find(r => r.isCurrent)
    expect(current?.scoreRange).toBe('55–70')
  })

  it('score 100 marks row 85-100 as current', () => {
    const rows = getHistoricalReturns(100)
    const current = rows.find(r => r.isCurrent)
    expect(current?.scoreRange).toBe('85–100')
  })

  it('exactly one row is marked current', () => {
    const rows = getHistoricalReturns(42)
    expect(rows.filter(r => r.isCurrent)).toHaveLength(1)
  })
})
