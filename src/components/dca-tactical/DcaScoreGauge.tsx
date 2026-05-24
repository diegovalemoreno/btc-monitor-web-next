'use client'

import type { DcaMarketState } from '@/lib/dca-tactical/types'

export const STATE_COLOR: Record<DcaMarketState, string> = {
  DEFENSIVE:  '#FF6D00',
  NEUTRAL:    '#FFD600',
  FAVORABLE:  '#00BCD4',
  AGGRESSIVE: '#00C853',
}

export const STATE_LABEL: Record<DcaMarketState, string> = {
  DEFENSIVE:  'Defensivo',
  NEUTRAL:    'Neutro',
  FAVORABLE:  'Favorável',
  AGGRESSIVE: 'Agressivo',
}

export const STATE_DESC: Record<DcaMarketState, string> = {
  DEFENSIVE:  'Preservar caixa — aguardar janela melhor.',
  NEUTRAL:    'Manter cadência regular — sem urgência tática.',
  FAVORABLE:  'Janela de aporte — aumentar intensidade.',
  AGGRESSIVE: 'Usar maior parte do caixa tático disponível.',
}

interface Props {
  score:       number
  marketState: DcaMarketState
}

export default function DcaScoreGauge({ score, marketState }: Props) {
  const color = STATE_COLOR[marketState]
  const label = STATE_LABEL[marketState]

  // Semicircle arc: center=(100,95), r=72
  // Left (20°): (28, 95), Right (160°): (172, 95), over top
  // end angle formula: 180° + 180° * (score/100) in SVG coords (clockwise=positive)
  const cx = 100, cy = 95, r = 72
  const startX = cx - r  // (28, 95)
  const endX   = cx + r  // (172, 95)
  const scoreRatio = Math.min(0.998, Math.max(0.002, score / 100))
  const angleDeg   = 180 + 180 * scoreRatio
  const angleRad   = (angleDeg * Math.PI) / 180
  const ptX        = cx + r * Math.cos(angleRad)
  const ptY        = cy + r * Math.sin(angleRad)

  // Track uses two 90° segments to avoid degenerate 180° arc
  const midX = cx          // (100, 95 - 72) = (100, 23)
  const midY = cy - r

  const trackD =
    `M ${startX},${cy} A ${r},${r} 0 0,1 ${midX},${midY} A ${r},${r} 0 0,1 ${endX},${cy}`
  // Arc angle is always < 180° (max = 179.6° at score=100), so large-arc is always 0.
  // sweep=1 (clockwise) goes over the top from left to right.
  const fillD =
    score > 0
      ? `M ${startX},${cy} A ${r},${r} 0 0,1 ${ptX.toFixed(2)},${ptY.toFixed(2)}`
      : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <svg viewBox="0 0 200 112" style={{ width: '100%', maxWidth: '220px' }}>
        {/* Track */}
        <path
          d={trackD}
          fill="none"
          stroke="var(--surface3)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        {/* Active fill */}
        {fillD && (
          <path
            d={fillD}
            fill="none"
            stroke={color}
            strokeWidth="13"
            strokeLinecap="round"
          />
        )}
        {/* Score number */}
        <text
          x="100" y="88"
          textAnchor="middle"
          fill="var(--text)"
          fontSize="38"
          fontWeight="700"
          fontFamily="'Courier New', monospace"
        >
          {score}
        </text>
        <text
          x="100" y="105"
          textAnchor="middle"
          fill="var(--text-muted)"
          fontSize="9"
          fontFamily="sans-serif"
          letterSpacing="1.5"
        >
          DCA SCORE
        </text>
      </svg>

      {/* State badge */}
      <div style={{
        padding:       '5px 18px',
        background:    `${color}18`,
        border:        `1px solid ${color}55`,
        borderRadius:  '20px',
        fontSize:      '11px',
        fontWeight:    700,
        color,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>

      <p style={{
        margin:     0,
        fontSize:   '12px',
        color:      'var(--text-muted)',
        textAlign:  'center',
        lineHeight: 1.5,
        maxWidth:   '180px',
      }}>
        {STATE_DESC[marketState]}
      </p>
    </div>
  )
}
