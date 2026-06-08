'use client'

function fNum(v: number | null | undefined): string {
  if (!v) return '—'
  if (v >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T'
  if (v >= 1e9)  return '$' + (v / 1e9).toFixed(2)  + 'B'
  if (v >= 1e6)  return '$' + (v / 1e6).toFixed(2)  + 'M'
  return '$' + v.toLocaleString('en-US')
}

function fPct(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toFixed(1) + '%'
}

function fPrice(v: number | null | undefined): string {
  if (!v) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

interface Props {
  marketCapUsd: number | null
  volume24hUsd: number | null
  athUsd:       number | null
  dominancePct: number | null
  btcPriceUsd:  number | null
}

export default function MarketKPIRow({ marketCapUsd, volume24hUsd, athUsd, dominancePct, btcPriceUsd }: Props) {
  const kpis = [
    { label: 'Market Cap',     value: fNum(marketCapUsd) },
    { label: 'Dominância BTC', value: fPct(dominancePct) },
    { label: 'Volume 24h',     value: fNum(volume24hUsd) },
    { label: 'ATH Histórico',  value: fPrice(athUsd) },
    { label: 'Preço Atual',    value: fPrice(btcPriceUsd) },
  ]

  return (
    <div
      className="kpi-grid"
      style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        borderBottom:        '1px solid var(--border)',
      }}
    >
      {kpis.map(({ label, value }, i) => (
        <div
          key={label}
          style={{
            padding:     '18px 20px',
            borderRight: i < kpis.length - 1 ? '1px solid var(--border)' : 'none',
            transition:  'background 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {label}
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}
