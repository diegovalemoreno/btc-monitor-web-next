// src/components/dashboard/HeroSection.tsx
import type { TacticalSignal, MarketRegime, RiskLevel, ActionBias } from '@lib/shared/types/signal'

const REGIME_LABEL: Record<MarketRegime, string> = {
  CAPITULATION_ZONE:       'Capitulação',
  TACTICAL_BUY_AGGRESSIVE: 'Compra Tática Agressiva',
  TACTICAL_BUY_MODERATE:   'Compra Tática Moderada',
  TACTICAL_BUY_LIGHT:      'Compra Tática Leve',
  NEUTRAL:                 'Neutro',
  RISK_OFF:                'Risk-off',
  EXTREME_RISK:            'Risco Extremo',
  OVERLEVERAGED_MARKET:    'Mercado Alavancado',
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
  DCA_NORMAL:              'DCA Normal',
  TACTICAL_BUY_LIGHT:      'Compra leve',
  TACTICAL_BUY_MODERATE:   'Compra moderada',
  TACTICAL_BUY_AGGRESSIVE: 'Compra agressiva',
  WAIT:                    'Aguardar',
  RISK_OFF:                'Risk-off',
}

function formatBTC(price: number | null): string {
  if (!price) return '—'
  return new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency:              'USD',
    maximumFractionDigits: 0,
  }).format(price)
}

function scoreColor(score: number): string {
  if (score > 60) return '#00C853'
  if (score > 40) return '#e08a3a'
  return '#FF1744'
}

interface HeroSectionProps {
  signal:           TacticalSignal
  opportunityScore: number
  updatedAt:        string
}

export default function HeroSection({ signal, opportunityScore, updatedAt }: HeroSectionProps) {
  const regimeColor = REGIME_COLOR[signal.regime]   ?? '#b0a090'
  const regimeLabel = REGIME_LABEL[signal.regime]   ?? signal.regime
  const riskColor   = RISK_COLOR[signal.riskLevel]  ?? 'var(--text-muted)'
  const riskLabel   = RISK_LABEL[signal.riskLevel]  ?? signal.riskLevel
  const biasLabel   = BIAS_LABEL[signal.actionBias] ?? signal.actionBias
  const numColor    = scoreColor(opportunityScore)

  return (
    <div style={{
      position:     'relative',
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '16px',
      padding:      '40px 48px',
      marginBottom: '24px',
      overflow:     'hidden',
      textAlign:    'center',
    }}>
      {/* Regime glow — top radial */}
      <div style={{
        position:      'absolute',
        inset:         0,
        background:    `radial-gradient(ellipse 70% 120% at 50% -10%, ${regimeColor}13 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />
      {/* Score glow ring behind the number */}
      <div style={{
        position:      'absolute',
        top:           '50%',
        left:          '50%',
        transform:     'translate(-50%, -50%)',
        width:         '320px',
        height:        '320px',
        background:    `radial-gradient(circle, ${numColor}08 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Label */}
      <div style={{
        fontSize:      '10px',
        fontWeight:    700,
        letterSpacing: '0.2em',
        color:         'var(--orange)',
        textTransform: 'uppercase',
        marginBottom:  '16px',
        position:      'relative',
      }}>
        Oportunidade de Entrada
      </div>

      {/* Score */}
      <div style={{
        fontSize:      '88px',
        fontWeight:    900,
        color:         numColor,
        lineHeight:    1,
        letterSpacing: '-4px',
        position:      'relative',
        textShadow:    `0 0 80px ${numColor}30`,
      }}>
        {Math.round(opportunityScore)}
      </div>

      {/* /100 */}
      <div style={{
        fontSize:      '11px',
        color:         'var(--text-muted)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        marginTop:     '4px',
        position:      'relative',
      }}>
        / 100
      </div>

      {/* Regime label */}
      <div style={{
        fontSize:   '18px',
        fontWeight: 800,
        color:      'var(--text)',
        marginTop:  '20px',
        position:   'relative',
      }}>
        {regimeLabel}
      </div>

      {/* Price · timestamp */}
      <div style={{
        fontSize:  '13px',
        color:     'var(--text-muted)',
        marginTop: '6px',
        position:  'relative',
      }}>
        {formatBTC(signal.btcPrice)} · {updatedAt}
      </div>

      {/* Narrative reading */}
      {signal.reading && (
        <div style={{
          fontSize:   '12px',
          color:      'var(--text-muted)',
          lineHeight: 1.7,
          maxWidth:   '480px',
          margin:     '12px auto 0',
          position:   'relative',
        }}>
          {signal.reading}
        </div>
      )}

      {/* Pills */}
      <div style={{
        display:        'flex',
        gap:            '8px',
        justifyContent: 'center',
        marginTop:      '20px',
        position:       'relative',
      }}>
        <div style={{
          fontSize:     '10px',
          fontWeight:   600,
          borderRadius: '5px',
          padding:      '4px 14px',
          background:   `${riskColor}15`,
          border:       `1px solid ${riskColor}33`,
          color:        riskColor,
        }}>
          Risco: {riskLabel}
        </div>
        <div style={{
          fontSize:     '10px',
          fontWeight:   600,
          borderRadius: '5px',
          padding:      '4px 14px',
          background:   'var(--surface2)',
          border:       '1px solid var(--border-dim)',
          color:        'var(--text-muted)',
        }}>
          {biasLabel}
        </div>
      </div>
    </div>
  )
}
