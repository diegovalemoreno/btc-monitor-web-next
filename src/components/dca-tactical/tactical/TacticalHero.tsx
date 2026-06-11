'use client'

const REGIME_LABEL: Record<string, string> = {
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

function scoreColor(s: number): string {
  if (s <= 25) return '#ef4444'
  if (s <= 40) return '#f97316'
  if (s <= 55) return '#eab308'
  if (s <= 70) return '#00bcd4'
  return '#22c55e'
}

function formatPrice(usd: number | null): string {
  if (!usd) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(usd)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface Props {
  score:       number
  regime:      string
  reading:     string
  btcPriceUsd: number | null
  generatedAt: string
}

export default function TacticalHero({ score, regime, reading, btcPriceUsd, generatedAt }: Props) {
  const color       = scoreColor(score)
  const regimeLabel = REGIME_LABEL[regime] ?? regime

  return (
    <div style={{
      position:      'relative',
      overflow:      'hidden',
      padding:       '48px 32px 52px',
      display:       'flex',
      flexDirection: 'column',
      alignItems:    'center',
      textAlign:     'center',
      borderBottom:  '1px solid var(--border)',
    }}>
      {/* Background glow */}
      <div style={{
        position:      'absolute',
        width:         '500px',
        height:        '300px',
        borderRadius:  '50%',
        filter:        'blur(80px)',
        top:           0,
        left:          '50%',
        transform:     'translateX(-50%)',
        background:    color,
        opacity:       0.12,
        pointerEvents: 'none',
      }} />

      {/* Score number */}
      <div style={{
        position:      'relative',
        fontSize:      'clamp(80px, 16vw, 160px)',
        fontWeight:    900,
        color,
        lineHeight:    1,
        letterSpacing: '-5px',
        textShadow:    `0 0 100px ${color}44`,
      }}>
        {Math.round(score)}
      </div>

      {/* / 100 */}
      <div style={{ position: 'relative', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '4px' }}>
        / 100
      </div>

      {/* Regime verdict */}
      <div style={{ position: 'relative', fontSize: '22px', fontWeight: 900, color: 'var(--text)', marginTop: '18px', letterSpacing: '-0.5px' }}>
        {regimeLabel.toUpperCase()}
      </div>

      {/* Reading */}
      {reading && (
        <div style={{ position: 'relative', fontSize: '15px', color: 'var(--text-muted)', maxWidth: '520px', lineHeight: 1.6, marginTop: '12px' }}>
          {reading}
        </div>
      )}

      {/* BTC price + timestamp */}
      <div style={{ position: 'relative', fontSize: '13px', color: 'var(--text-muted)', marginTop: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>BTC: <strong style={{ color: 'var(--text)' }}>{formatPrice(btcPriceUsd)}</strong></span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span>Atualizado em: {formatTime(generatedAt)}</span>
      </div>
    </div>
  )
}
