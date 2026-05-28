import type { BestWorstEntry } from '@lib/rentabilidade/types'

function Row({ entry, isPositive }: { entry: BestWorstEntry; isPositive: boolean }) {
  const color = isPositive ? '#4ade80' : '#f87171'
  const sign  = isPositive ? '+' : ''
  return (
    <div style={{
      display:    'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding:    '6px 0',
    }}>
      <span style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>
        {entry.label}
      </span>
      <span style={{ fontSize: '12px', fontWeight: 700, color }}>
        {sign}{entry.returnPct.toFixed(0)}%
      </span>
    </div>
  )
}

interface Props {
  bestPeriods:  BestWorstEntry[]
  worstPeriods: BestWorstEntry[]
}

export default function BestWorstPanel({ bestPeriods, worstPeriods }: Props) {
  return (
    <div style={{
      background:   'var(--surface2)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding:      '20px 22px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '18px' }}>
        Melhores e piores períodos de compra
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '9px', color: '#4ade80', textTransform: 'uppercase',
          letterSpacing: '1.5px', fontWeight: 700, marginBottom: '6px',
        }}>
          Melhores períodos
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {bestPeriods.map((e, i) => <Row key={i} entry={e} isPositive />)}
        </div>
      </div>

      <div>
        <div style={{
          fontSize: '9px', color: '#f87171', textTransform: 'uppercase',
          letterSpacing: '1.5px', fontWeight: 700, marginBottom: '6px',
        }}>
          Piores períodos
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {worstPeriods.map((e, i) => <Row key={i} entry={e} isPositive={false} />)}
        </div>
      </div>
    </div>
  )
}
