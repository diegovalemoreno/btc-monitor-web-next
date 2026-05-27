'use client'
import type { PatrimonioData } from '@lib/rentabilidade/types'
import PatrimonioHero from './PatrimonioHero'
import BtcChart from './BtcChart'
import InsightsPanel from './InsightsPanel'
import AporteHeatmap from './AporteHeatmap'

interface Props { patrimonio: PatrimonioData }

export default function RentabilidadeView({ patrimonio }: Props) {
  if (patrimonio.contributionCount === 0) {
    return (
      <div style={{
        padding: '32px 24px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: '12px',
        fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center',
      }}>
        Nenhum aporte com BTC registrado encontrado.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <PatrimonioHero patrimonio={patrimonio} />
      <BtcChart patrimonio={patrimonio} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '14px' }}>
        <InsightsPanel insights={patrimonio.insights} />
        <AporteHeatmap heatmap={patrimonio.heatmap} />
      </div>
    </div>
  )
}
