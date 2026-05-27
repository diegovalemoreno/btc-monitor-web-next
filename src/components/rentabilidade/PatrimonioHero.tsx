'use client'
import type { PatrimonioData } from '@lib/rentabilidade/types'

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const fmtBtc = (n: number) =>
  n.toFixed(8).replace(/\.?0+$/, '') + ' ₿'

function Sparkline({ history }: { history: { date: string; price: number }[] }) {
  const recent = history.slice(-30)
  if (recent.length < 2) return null
  const min = Math.min(...recent.map(p => p.price))
  const max = Math.max(...recent.map(p => p.price))
  const range = max - min || 1
  const w = 90
  const h = 32
  const pts = recent.map((p, i) => {
    const x = (i / (recent.length - 1)) * w
    const y = h - ((p.price - min) / range) * (h - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h }}>
      <defs>
        <linearGradient id="spark-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#spark-g)" />
      <polyline points={pts} fill="none" stroke="#4ade80" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={recent[recent.length - 1] ? h - ((recent[recent.length - 1].price - min) / range) * (h - 4) - 2 : h / 2} r={2.5} fill="#4ade80" />
    </svg>
  )
}

interface Props { patrimonio: PatrimonioData }

export default function PatrimonioHero({ patrimonio }: Props) {
  const {
    currentValue, totalInvested, totalReturn, totalReturnBrl,
    avgPrice, totalBtc, contributionCount, currentBtcPrice, priceHistory,
  } = patrimonio

  const returnColor  = totalReturn >= 0 ? '#4ade80' : '#ef4444'
  const returnPrefix = totalReturn >= 0 ? '▲' : '▼'

  return (
    <div style={{
      background:     'linear-gradient(135deg, #0c1a24 0%, #112233 50%, #0c1a24 100%)',
      border:         '1px solid rgba(251,191,36,0.2)',
      borderRadius:   '14px',
      padding:        '24px 28px',
      position:       'relative',
      overflow:       'hidden',
    }}>
      {/* glow */}
      <div style={{
        position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
        width: '320px', height: '100px',
        background: 'radial-gradient(ellipse, rgba(251,191,36,0.1), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontSize: '8px', color: '#fbbf24', textTransform: 'uppercase',
            letterSpacing: '2.5px', marginBottom: '10px', fontWeight: 700,
          }}>
            Patrimônio Bitcoin
          </div>
          <div style={{ fontSize: '34px', fontWeight: 900, color: '#fff', letterSpacing: '-1.5px', lineHeight: 1, marginBottom: '10px' }}>
            {fmt0(currentValue)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: returnColor, fontWeight: 800 }}>
              {returnPrefix} {Math.abs(totalReturn).toFixed(1).replace('.', ',')}%
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              {totalReturn >= 0 ? '+' : ''}{fmt0(totalReturnBrl)} total
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>BTC / 30 dias</div>
          <div style={{
            background: 'rgba(74,222,128,0.08)', borderRadius: '8px',
            padding: '5px', border: '1px solid rgba(74,222,128,0.15)',
          }}>
            <Sparkline history={priceHistory} />
          </div>
          <div style={{ fontSize: '10px', color: '#4ade80', fontWeight: 700, marginTop: '5px' }}>
            {fmt0(currentBtcPrice)}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px',
        marginTop: '20px', paddingTop: '18px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        {[
          { label: 'Preço médio DCA', value: fmt0(avgPrice),        color: '#fbbf24' },
          { label: 'BTC acumulado',   value: fmtBtc(totalBtc),      color: '#fff'    },
          { label: 'Total investido', value: fmt0(totalInvested),    color: '#fff'    },
          { label: 'Aportes',         value: String(contributionCount), color: '#fff' },
        ].map(kpi => (
          <div key={kpi.label}>
            <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: kpi.color }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
