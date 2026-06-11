'use client'
import type { PatrimonioData } from '@lib/rentabilidade/types'
import PatrimonioHero   from './PatrimonioHero'
import PatrimonioChart  from './PatrimonioChart'
import AportesStatus    from './AportesStatus'
import InsightsPanel    from './InsightsPanel'
import BestWorstPanel   from './BestWorstPanel'

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  )
}

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

  const { insights, bestPeriods, worstPeriods, evolution, currentBtcPrice } = patrimonio

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

      <PatrimonioHero patrimonio={patrimonio} />

      <div>
        <SectionHeader label="Evolução do Patrimônio" />
        <PatrimonioChart evolution={evolution} />
      </div>

      <div>
        <SectionHeader label="Análise dos Aportes" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          <AportesStatus
            profitableCount={insights.profitableCount}
            totalCount={insights.totalCount}
            currentBtcPrice={currentBtcPrice}
          />
          <InsightsPanel patrimonio={patrimonio} />
          <BestWorstPanel bestPeriods={bestPeriods} worstPeriods={worstPeriods} />
        </div>
      </div>

      <div style={{
        textAlign:  'center',
        fontSize:   '10px',
        color:      'var(--text-muted)',
        padding:    '4px 0 8px',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}>
        Preço atual do Bitcoin: {fmt0(currentBtcPrice)}
      </div>
    </div>
  )
}
