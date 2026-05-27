import type { InsightData } from '@lib/rentabilidade/types'

function InsightCard({
  label, value, valueColor, sub, last,
}: {
  label: string; value: string; valueColor: string; sub: string; last?: boolean
}) {
  return (
    <div style={{
      paddingBottom: last ? 0 : '12px',
      marginBottom:  last ? 0 : '12px',
      borderBottom:  last ? 'none' : '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 800, color: valueColor, marginBottom: '2px' }}>
        {value}
      </div>
      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
        {sub}
      </div>
    </div>
  )
}

interface Props { insights: InsightData }

export default function InsightsPanel({ insights }: Props) {
  const { bestContribution, profitableCount, totalCount, dcaVsLumpSumPct } = insights

  const accuracy = totalCount > 0 ? Math.round((profitableCount / totalCount) * 100) : 0

  const dcaInsight = dcaVsLumpSumPct !== null
    ? {
        value:      `DCA gerou ${dcaVsLumpSumPct >= 0 ? '+' : ''}${dcaVsLumpSumPct.toFixed(1)}% extra`,
        valueColor: dcaVsLumpSumPct >= 0 ? '#fbbf24' : '#ef4444',
        sub:        `vs compra única no primeiro aporte`,
      }
    : { value: 'Dados insuficientes', valueColor: 'rgba(255,255,255,0.4)', sub: 'Precisa de ao menos 2 aportes' }

  return (
    <div style={{
      background:   'rgba(251,191,36,0.04)',
      border:       '1px solid rgba(251,191,36,0.12)',
      borderRadius: '14px',
      padding:      '16px 18px',
    }}>
      <div style={{
        fontSize: '8px', color: '#fbbf24', textTransform: 'uppercase',
        letterSpacing: '1.5px', marginBottom: '14px', fontWeight: 700,
      }}>
        ✦ Insights
      </div>

      <InsightCard
        label="Melhor aporte"
        value={`${bestContribution.label} · +${bestContribution.returnPct.toFixed(0)}%`}
        valueColor="#4ade80"
        sub="Maior retorno individual da sua carteira"
      />
      <InsightCard
        label="DCA eficiente"
        value={`${profitableCount} de ${totalCount} aportes em lucro`}
        valueColor="#fff"
        sub={`${accuracy}% de taxa de acerto`}
      />
      <InsightCard
        label="DCA vs compra única"
        value={dcaInsight.value}
        valueColor={dcaInsight.valueColor}
        sub={dcaInsight.sub}
        last
      />
    </div>
  )
}
