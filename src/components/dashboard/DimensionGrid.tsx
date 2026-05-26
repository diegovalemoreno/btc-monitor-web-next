// src/components/dashboard/DimensionGrid.tsx
'use client'

import type { IndicatorGroup } from '@lib/shared/types/signal'
import DimensionCard from './DimensionCard'

interface DimensionGridProps {
  groups: IndicatorGroup[]
}

export default function DimensionGrid({ groups }: DimensionGridProps) {
  if (!groups || groups.length === 0) return null

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ marginBottom: '12px' }}>
        <span style={{
          fontSize:      '11px',
          fontWeight:    600,
          color:         'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          Indicadores por dimensão
        </span>
      </div>
      <div className="grid-3">
        {groups.map(g => <DimensionCard key={g.key} group={g} />)}
      </div>
    </div>
  )
}
