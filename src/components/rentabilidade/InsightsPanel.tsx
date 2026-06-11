import type { PatrimonioData } from '@lib/rentabilidade/types'

type InsightType = 'good' | 'warn' | 'info'

function InsightIcon({ type }: { type: InsightType }) {
  const bg    = type === 'good' ? '#166534' : type === 'warn' ? '#92400e' : '#1e3a5f'
  const border = type === 'good' ? '#22c55e' : type === 'warn' ? '#f59e0b' : '#3b82f6'
  const symbol = type === 'good' ? '✓' : type === 'warn' ? '!' : 'i'
  const color  = type === 'good' ? '#4ade80' : type === 'warn' ? '#fbbf24' : '#60a5fa'
  return (
    <div style={{
      width: '20px', height: '20px', borderRadius: '50%',
      background: bg, border: `1.5px solid ${border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '9px', fontWeight: 800, color, flexShrink: 0,
    }}>
      {symbol}
    </div>
  )
}

function buildInsights(patrimonio: PatrimonioData): Array<{ text: string; type: InsightType }> {
  const { insights, totalReturn, avgPrice, currentBtcPrice, contributionCount } = patrimonio
  const belowAvgPct = ((currentBtcPrice - avgPrice) / avgPrice) * 100

  return [
    {
      text: insights.bestContribution.returnPct > 200
        ? 'Seus melhores aportes ocorreram durante períodos de medo extremo do mercado.'
        : `Seu melhor aporte (${insights.bestContribution.label}) rendeu +${insights.bestContribution.returnPct.toFixed(0)}%.`,
      type: 'good',
    },
    {
      text: 'O DCA reduziu significativamente o impacto da volatilidade do Bitcoin.',
      type: 'good',
    },
    {
      text: belowAvgPct < 0
        ? `Você está ${Math.abs(belowAvgPct).toFixed(1)}% abaixo do seu preço médio. Continuação do plano pode melhorar seu custo.`
        : `Você está ${belowAvgPct.toFixed(1)}% acima do seu preço médio. DCA está funcionando.`,
      type: belowAvgPct < 0 ? 'warn' : 'good',
    },
    {
      text: contributionCount > 12
        ? 'Estratégia de longo prazo mantém-se sólida e alinhada ao ciclo do Bitcoin.'
        : 'Continue acumulando regularmente para maximizar o efeito do DCA.',
      type: 'good',
    },
  ]
}

interface Props { patrimonio: PatrimonioData }

export default function InsightsPanel({ patrimonio }: Props) {
  const items = buildInsights(patrimonio)

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderTop:    '2px solid #3b82f6',
      borderRadius: '12px',
      padding:      '20px 22px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '18px' }}>
        Insights
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <InsightIcon type={item.type} />
            <div style={{ fontSize: '11px', color: 'var(--text)', lineHeight: 1.6, paddingTop: '2px' }}>
              {item.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
