// src/components/dashboard/ConsensusBadge.tsx
import type { IndicatorGroup } from '@lib/shared/types/signal'

interface ConsensusBadgeProps {
  groups: IndicatorGroup[]
}

export default function ConsensusBadge({ groups }: ConsensusBadgeProps) {
  const all = groups.flatMap(g => g.indicators)
  const pos = all.filter(i => i.score > 1).length
  const neu = all.filter(i => i.score >= -1 && i.score <= 1).length
  const neg = all.filter(i => i.score < -1).length

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '12px', color: '#00C853', fontWeight: 600 }}>{pos} positivos</span>
      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>·</span>
      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{neu} neutros</span>
      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>·</span>
      <span style={{ fontSize: '12px', color: '#e08a3a', fontWeight: 600 }}>{neg} alertas</span>
    </div>
  )
}
