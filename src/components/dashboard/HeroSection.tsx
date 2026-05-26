// src/components/dashboard/HeroSection.tsx
import type { TacticalSignal, MarketRegime, RiskLevel, ActionBias } from '@lib/shared/types/signal'
import ScoreGauge from './ScoreGauge'
import ConsensusBadge from './ConsensusBadge'

const REGIME_LABEL: Record<MarketRegime, string> = {
  CAPITULATION_ZONE:       'Capitulação',
  TACTICAL_BUY_AGGRESSIVE: 'Compra tática agressiva',
  TACTICAL_BUY_MODERATE:   'Compra tática moderada',
  TACTICAL_BUY_LIGHT:      'Compra tática leve',
  NEUTRAL:                 'Neutro',
  RISK_OFF:                'Risk-off',
  EXTREME_RISK:            'Risco extremo',
  OVERLEVERAGED_MARKET:    'Mercado alavancado',
  EUPHORIA_ZONE:           'Euforia',
}

const REGIME_COLOR: Record<MarketRegime, string> = {
  CAPITULATION_ZONE:       '#69F0AE',
  TACTICAL_BUY_AGGRESSIVE: '#00C853',
  TACTICAL_BUY_MODERATE:   '#00BCD4',
  TACTICAL_BUY_LIGHT:      '#e08a3a',
  NEUTRAL:                 '#b0a090',
  RISK_OFF:                '#FFD600',
  EXTREME_RISK:            '#FF6D00',
  OVERLEVERAGED_MARKET:    '#FF1744',
  EUPHORIA_ZONE:           '#b71c1c',
}

const RISK_LABEL: Record<RiskLevel, string> = {
  LOW:     'Baixo',
  MEDIUM:  'Médio',
  HIGH:    'Alto',
  EXTREME: 'Extremo',
}

const RISK_COLOR: Record<RiskLevel, string> = {
  LOW:     '#00C853',
  MEDIUM:  '#e08a3a',
  HIGH:    '#FF6D00',
  EXTREME: '#FF1744',
}

const BIAS_LABEL: Record<ActionBias, string> = {
  DCA_NORMAL:               'DCA Normal',
  TACTICAL_BUY_LIGHT:       'Compra leve',
  TACTICAL_BUY_MODERATE:    'Compra moderada',
  TACTICAL_BUY_AGGRESSIVE:  'Compra agressiva',
  WAIT:                     'Aguardar',
  RISK_OFF:                 'Risk-off',
}

function formatBTC(price: number | null): string {
  if (!price) return '—'
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

interface HeroSectionProps {
  signal:           TacticalSignal
  opportunityScore: number
  updatedAt:        string
}

export default function HeroSection({ signal, opportunityScore, updatedAt }: HeroSectionProps) {
  const color      = REGIME_COLOR[signal.regime]    ?? '#b0a090'
  const label      = REGIME_LABEL[signal.regime]    ?? signal.regime
  const riskColor  = RISK_COLOR[signal.riskLevel]   ?? 'var(--text-muted)'
  const riskLabel  = RISK_LABEL[signal.riskLevel]   ?? signal.riskLevel
  const biasLabel  = BIAS_LABEL[signal.actionBias]  ?? signal.actionBias

  return (
    <div style={{
      background:      'var(--surface)',
      border:          '1px solid var(--border-dim)',
      borderLeft:      `4px solid ${color}`,
      borderRadius:    '12px',
      padding:         '28px 28px 24px',
      marginBottom:    '24px',
      boxShadow:       `inset 0 0 80px ${color}08`,
      display:         'flex',
      alignItems:      'flex-start',
      justifyContent:  'space-between',
      gap:             '24px',
      flexWrap:        'wrap',
    }}>

      {/* Left: regime info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:       '11px',
          fontWeight:     600,
          letterSpacing:  '0.15em',
          color:          'var(--orange)',
          textTransform:  'uppercase',
          marginBottom:   '6px',
        }}>
          Análise Tática
        </div>

        <div style={{ fontSize: '22px', fontWeight: 700, color, marginBottom: '4px' }}>
          {label}
        </div>

        <div style={{
          fontSize:     '32px',
          fontWeight:   700,
          color:        'var(--text)',
          marginBottom: '12px',
          lineHeight:   1.1,
        }}>
          {formatBTC(signal.btcPrice)}
        </div>

        {signal.reading && (
          <p style={{
            margin:     '0 0 14px',
            fontSize:   '13px',
            color:      'var(--text-sec)',
            lineHeight: 1.6,
            maxWidth:   '520px',
            overflow:   'hidden',
            maxHeight:  '2.8em',
          }}>
            {signal.reading}
          </p>
        )}

        <ConsensusBadge groups={signal.indicatorGroups} />
      </div>

      {/* Right: gauge + pills */}
      <div style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        gap:            '14px',
        flexShrink:     0,
      }}>
        <ScoreGauge value={opportunityScore} size={88} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
          <div style={{
            background:   `${riskColor}15`,
            border:       `1px solid ${riskColor}33`,
            borderRadius: '6px',
            padding:      '4px 12px',
            fontSize:     '11px',
            fontWeight:   600,
            color:        riskColor,
          }}>
            Risco: {riskLabel}
          </div>

          <div style={{
            background:   'var(--surface2)',
            border:       '1px solid var(--border-dim)',
            borderRadius: '6px',
            padding:      '4px 12px',
            fontSize:     '11px',
            fontWeight:   600,
            color:        'var(--text-sec)',
          }}>
            {biasLabel}
          </div>

          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            {updatedAt}
          </div>
        </div>
      </div>
    </div>
  )
}
