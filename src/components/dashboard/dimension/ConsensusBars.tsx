'use client'
import type { IndicatorScore } from '@lib/shared/types/signal'

interface ConsensusBarsProps {
  indicators: IndicatorScore[]
}

export interface ConsensusData {
  bullish: number
  neutral: number
  bearish: number
}

export function computeConsensus(indicators: IndicatorScore[]): ConsensusData {
  if (indicators.length === 0) return { bullish: 0, neutral: 0, bearish: 0 }
  const total   = indicators.length
  const bullish = Math.round((indicators.filter(i => i.score > 0).length / total) * 100)
  const bearish = Math.round((indicators.filter(i => i.score < 0).length / total) * 100)
  const neutral = 100 - bullish - bearish
  return { bullish, neutral, bearish }
}

const BARS = [
  { key: 'bullish' as const, label: 'Bullish', color: '#00C853' },
  { key: 'neutral' as const, label: 'Neutro',  color: 'var(--text-muted)' },
  { key: 'bearish' as const, label: 'Bearish', color: '#FF6D00' },
]

export default function ConsensusBars({ indicators }: ConsensusBarsProps) {
  const data = computeConsensus(indicators)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {BARS.map(({ key, label, color }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', width: '44px', flexShrink: 0 }}>{label}</span>
          <div style={{ flex: 1, height: '6px', background: 'var(--surface3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${data[key]}%`, background: color,
              borderRadius: '3px', transition: 'width 0.4s ease',
            }} />
          </div>
          <span style={{ fontSize: '9px', color, fontWeight: 700, width: '28px', textAlign: 'right', flexShrink: 0 }}>
            {data[key]}%
          </span>
        </div>
      ))}
    </div>
  )
}
