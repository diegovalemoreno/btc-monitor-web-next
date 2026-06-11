'use client'

import type { DcaRecommendation } from '@/lib/dca/recommendation'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

function scoreColor(score: number): string {
  if (score < 20) return '#22c55e'
  if (score < 35) return '#84cc16'
  if (score < 55) return '#84cc16'
  if (score < 70) return '#71717a'
  if (score < 85) return '#f97316'
  return '#ef4444'
}

interface Props {
  recommendation: DcaRecommendation
  monthlyAmountBrl: number
}

export default function DcaRecommendationHero({ recommendation, monthlyAmountBrl }: Props) {
  const { recommendedAmount, multiplier, label, score } = recommendation
  const color = scoreColor(score)
  const multLabel = multiplier === 1.0
    ? '100% do mensal'
    : `${(multiplier * 100).toFixed(0)}% do mensal`

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderTop:    '2px solid var(--orange)',
      borderRadius: '12px',
      padding:      '36px 32px',
    }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px' }}>
        Aporte Recomendado
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ fontSize: 'clamp(36px, 8vw, 64px)', fontWeight: 900, color, letterSpacing: '-2px', lineHeight: 1 }}>
          {fmt(recommendedAmount)}
        </div>
        <div style={{ paddingBottom: '8px', color: 'var(--text-muted)', fontSize: '15px' }}>
          {multLabel} · seu mensal: {fmt(monthlyAmountBrl)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{
          padding: '6px 14px', borderRadius: '999px',
          border: `1.5px solid ${color}`, color, fontSize: '13px', fontWeight: 700,
        }}>
          Score {score}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          {label}
        </div>
      </div>
    </div>
  )
}
