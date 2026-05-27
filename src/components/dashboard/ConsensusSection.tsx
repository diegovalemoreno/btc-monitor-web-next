// src/components/dashboard/ConsensusSection.tsx
import type { IndicatorGroup } from '@lib/shared/types/signal'

interface ConsensusSectionProps {
  groups: IndicatorGroup[]
}

function narrativeTitle(pos: number, total: number): string {
  const r = pos / total
  if (r >= 0.7) return 'Maioria dos indicadores favorável'
  if (r >= 0.5) return 'Leve maioria favorável'
  if (r >= 0.3) return 'Cenário misto'
  return 'Maioria dos indicadores em alerta'
}

function narrativeBody(pos: number, neg: number, total: number): string {
  if (neg === 0) return `${pos} de ${total} indicadores bullish. Nenhum em zona de risco. Momento propício para acumulação.`
  if (neg === 1) return `${pos} de ${total} indicadores bullish. ${neg} indicador em alerta — monitorar de perto.`
  return `${pos} de ${total} indicadores bullish. ${neg} indicadores em alerta — cautela recomendada.`
}

export default function ConsensusSection({ groups }: ConsensusSectionProps) {
  const all   = groups.flatMap(g => g.indicators)
  const pos   = all.filter(i => i.score > 1).length
  const neu   = all.filter(i => i.score >= -1 && i.score <= 1).length
  const neg   = all.filter(i => i.score < -1).length
  const total = all.length || 1

  const r    = 38
  const circ = 2 * Math.PI * r  // ≈ 238.76

  const gap    = total > 1 ? 2 : 0
  const posArc = Math.max(0, (pos / total) * circ - gap)
  const neuArc = Math.max(0, (neu / total) * circ - gap)
  const negArc = Math.max(0, (neg / total) * circ - gap)

  const neuOffset = -(posArc + gap)
  const negOffset = -(posArc + gap + neuArc + gap)

  const bullPct = Math.round((pos / total) * 100)

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '12px',
      padding:      '20px 24px',
      marginBottom: '24px',
    }}>
      <div style={{
        fontSize:      '10px',
        fontWeight:    700,
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom:  '16px',
      }}>
        Consenso do Mercado
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Donut */}
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface3)" strokeWidth="12" />

          {pos > 0 && (
            <circle cx="50" cy="50" r={r} fill="none" stroke="#00C853" strokeWidth="12"
              strokeDasharray={`${posArc} ${circ}`}
              strokeDashoffset={0}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          )}
          {neu > 0 && (
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface3)" strokeWidth="12"
              strokeDasharray={`${neuArc} ${circ}`}
              strokeDashoffset={neuOffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          )}
          {neg > 0 && (
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--orange)" strokeWidth="12"
              strokeDasharray={`${negArc} ${circ}`}
              strokeDashoffset={negOffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          )}

          <text x="50" y="46" textAnchor="middle"
            fill="var(--text)" fontSize="20" fontWeight="900"
            fontFamily="Inter, system-ui, sans-serif">
            {bullPct}%
          </text>
          <text x="50" y="60" textAnchor="middle"
            fill="var(--text-muted)" fontSize="9"
            fontFamily="Inter, system-ui, sans-serif">
            bullish
          </text>
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00C853', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1, minWidth: '52px' }}>Bullish</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#00C853' }}>{pos}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--surface3)', border: '1px solid var(--border)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1, minWidth: '52px' }}>Neutro</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-muted)' }}>{neu}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flex: 1, minWidth: '52px' }}>Alerta</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--orange)' }}>{neg}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '1px', background: 'var(--border-dim)', alignSelf: 'stretch', flexShrink: 0 }} />

        {/* Narrative */}
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
            {narrativeTitle(pos, total)}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {narrativeBody(pos, neg, total)}
          </div>
        </div>

      </div>
    </div>
  )
}
