// src/components/dashboard/DimensionGrid.tsx
'use client'

import type { IndicatorGroup } from '@lib/shared/types/signal'
import DimensionCard from './DimensionCard'

interface DimensionGridProps {
  groups: IndicatorGroup[]
}

export default function DimensionGrid({ groups }: DimensionGridProps) {
  if (!groups || groups.length === 0) return null

  const spotlight = groups.find(g => g.key === 'trend')
  const medium1   = groups.find(g => g.key === 'onchain')
  const medium2   = groups.find(g => g.key === 'sentiment')

  const assignedKeys      = new Set(['trend', 'onchain', 'sentiment', 'derivatives', 'macro', 'synthesis'])
  const preferredCompacts = groups.filter(g => g.key === 'derivatives' || g.key === 'macro' || g.key === 'synthesis')
  const overflowCompacts  = groups.filter(g => !assignedKeys.has(g.key))
  const compacts          = [...preferredCompacts, ...overflowCompacts]

  return (
    <div>
      <div style={{
        fontSize:      '10px',
        fontWeight:    700,
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom:  '12px',
      }}>
        Dimensões do Mercado
      </div>

      <div className="grid-dimension">
        {spotlight && <DimensionCard group={spotlight} variant="spotlight" />}
        {medium1   && <DimensionCard group={medium1}   variant="medium" />}
        {medium2   && <DimensionCard group={medium2}   variant="medium" />}

        {compacts.length > 0 && (
          <div className="grid-dimension-compact">
            {compacts.map(g => (
              <DimensionCard key={g.key} group={g} variant="compact" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
