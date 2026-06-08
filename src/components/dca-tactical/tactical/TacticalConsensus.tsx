'use client'

// Import IndicatorGroup from wherever it's defined in the project, OR define locally if not found:
// import type { IndicatorGroup } from '@lib/shared/types/signal'

function narrativeSummary(pos: number, neu: number, neg: number): string {
  const total = pos + neu + neg || 1
  const pct   = Math.round((pos / total) * 100)
  if (neg === 0) return `${pos} de ${total} indicadores bullish. Nenhum em zona de risco. Momento propício para acumulação.`
  if (pct >= 70) return `${pos} de ${total} indicadores bullish. ${neg} em alerta — monitorar de perto.`
  if (pct >= 50) return `Leve maioria bullish (${pos}/${total}). ${neg} indicadores em alerta — cautela moderada.`
  return `Cenário misto (${pos} bullish, ${neg} em alerta). Aguardar maior clareza antes de posições táticas.`
}

interface IndicatorGroup {
  key:        string
  label:      string
  score:      number
  indicators: { name: string; score: number; summary: string }[]
}

interface Props {
  groups:       IndicatorGroup[]
  extraScores?: number[]
}

export default function TacticalConsensus({ groups, extraScores = [] }: Props) {
  const allScores = [
    ...groups.flatMap(g => g.indicators.map(i => i.score)),
    ...extraScores,
  ]
  const pos   = allScores.filter(s => s > 1).length
  const neu   = allScores.filter(s => s >= -1 && s <= 1).length
  const neg   = allScores.filter(s => s < -1).length
  const total = allScores.length || 1
  const bullPct = Math.round((pos / total) * 100)

  return (
    <div style={{ padding: '28px 32px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{ width: '3px', height: '14px', background: 'var(--orange)', borderRadius: '2px' }} />
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Consenso do Mercado
        </div>
      </div>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Counts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { label: 'Bullish', count: pos, color: '#22c55e' },
            { label: 'Neutro',  count: neu, color: '#71717a' },
            { label: 'Bearish', count: neg, color: '#ef4444' },
          ].map(({ label, count, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '60px' }}>{label}:</span>
              <span style={{ fontSize: '20px', fontWeight: 900, color }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Percentage + narrative */}
        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ fontSize: '42px', fontWeight: 900, color: bullPct >= 60 ? '#22c55e' : bullPct >= 40 ? '#eab308' : '#ef4444', lineHeight: 1, marginBottom: '10px' }}>
            {bullPct}%
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            dos indicadores bullish
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '420px' }}>
            {narrativeSummary(pos, neu, neg)}
          </div>
        </div>
      </div>
    </div>
  )
}
