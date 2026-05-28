'use client'
import type { PatrimonioData } from '@lib/rentabilidade/types'
import PatrimonioHero   from './PatrimonioHero'
import PatrimonioChart  from './PatrimonioChart'
import AportesStatus    from './AportesStatus'
import InsightsPanel    from './InsightsPanel'
import BestWorstPanel   from './BestWorstPanel'

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

interface Props { patrimonio: PatrimonioData }

export default function RentabilidadeView({ patrimonio }: Props) {
  if (patrimonio.contributionCount === 0) {
    return (
      <div style={{
        padding: '32px 24px', background: 'var(--surface2)',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px',
        fontSize: '13px', color: 'var(--text-sec)', textAlign: 'center',
      }}>
        Nenhum aporte com BTC registrado encontrado.
      </div>
    )
  }

  const { insights, bestPeriods, worstPeriods, evolution, currentBtcPrice } = patrimonio

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
          Rentabilidade
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          Retorno por aporte, calculado sobre o preço atual do Bitcoin.
        </p>
      </div>

      <PatrimonioHero patrimonio={patrimonio} />

      <PatrimonioChart evolution={evolution} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        <AportesStatus
          profitableCount={insights.profitableCount}
          totalCount={insights.totalCount}
          currentBtcPrice={currentBtcPrice}
        />
        <InsightsPanel patrimonio={patrimonio} />
        <BestWorstPanel bestPeriods={bestPeriods} worstPeriods={worstPeriods} />
      </div>

      <div style={{
        textAlign:  'center',
        fontSize:   '10px',
        color:      'var(--text-muted)',
        padding:    '8px 0',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
      }}>
        <span style={{ opacity: 0.6 }}>🔒</span>
        Dados atualizados com o preço atual do Bitcoin: {fmt0(currentBtcPrice)}
      </div>
    </div>
  )
}
