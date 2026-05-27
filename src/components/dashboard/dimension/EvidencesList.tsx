'use client'
import type { IndicatorScore } from '@lib/shared/types/signal'

interface EvidencesListProps {
  indicators:   IndicatorScore[]
  maxPositive?: number
  maxNegative?: number
}

export type EvidenceSymbol = '✓' | '⚠'

export interface Evidence {
  symbol:  EvidenceSymbol
  name:    string
  summary: string
  score:   number
}

export function buildEvidences(
  indicators:  IndicatorScore[],
  maxPositive = 3,
  maxNegative = 2,
): Evidence[] {
  const positive = indicators
    .filter(i => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPositive)
    .map(i => ({ symbol: '✓' as EvidenceSymbol, name: i.name, summary: i.summary, score: i.score }))

  const negative = indicators
    .filter(i => i.score < 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, maxNegative)
    .map(i => ({ symbol: '⚠' as EvidenceSymbol, name: i.name, summary: i.summary, score: i.score }))

  return [...positive, ...negative]
}

export default function EvidencesList({ indicators, maxPositive = 3, maxNegative = 2 }: EvidencesListProps) {
  const evidences = buildEvidences(indicators, maxPositive, maxNegative)
  if (evidences.length === 0) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {evidences.map((ev, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <span style={{
            fontSize: '10px', flexShrink: 0, marginTop: '1px',
            color: ev.symbol === '✓' ? '#00C853' : '#FF6D00',
          }}>
            {ev.symbol}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{ev.name}</span>
            {ev.summary ? ` — ${ev.summary}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}
