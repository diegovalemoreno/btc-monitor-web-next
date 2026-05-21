import type { TacticalSignal, MarketRegime } from '@lib/shared/types/signal'

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

function formatBTC(price: number | null): string {
  if (!price) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)
}

export default function RegimeCard({ signal }: { signal: TacticalSignal }) {
  const color = REGIME_COLOR[signal.regime] ?? '#b0a090'
  const label = REGIME_LABEL[signal.regime] ?? signal.regime
  const score = Math.round(signal.score.weighted)

  return (
    <div style={{
      background:   '#111111',
      border:       `1px solid ${color}33`,
      borderRadius: '12px',
      padding:      '24px',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>

        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#5a5040', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
            Regime de mercado
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color }}>{label}</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#e8e0d5', marginTop: '8px' }}>
            {formatBTC(signal.btcPrice)}
          </div>
          {signal.reading && (
            <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#b0a090', lineHeight: 1.6, maxWidth: '480px' }}>
              {signal.reading}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div style={{
            padding:      '8px 16px',
            background:   `${color}18`,
            border:       `1px solid ${color}44`,
            borderRadius: '8px',
            textAlign:    'center',
          }}>
            <div style={{ fontSize: '11px', color: '#5a5040', marginBottom: '2px' }}>Score</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color }}>{score > 0 ? `+${score}` : score}</div>
          </div>
          <div style={{ fontSize: '11px', color: '#5a5040' }}>
            Risco: <span style={{ color: '#b0a090' }}>{signal.riskLevel}</span>
          </div>
        </div>

      </div>
    </div>
  )
}
