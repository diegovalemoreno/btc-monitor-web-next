'use client'

import type { DcaContributionRow } from '@/lib/db/types'

interface MonthPoint {
  label:    string  // "Jul/25"
  cumBtc:   number  // BTC (decimal)
  cumBrl:   number  // BRL
  monthBrl: number  // BRL invested this month
  monthBtc: number  // BTC acquired this month
}

function buildChartData(contributions: DcaContributionRow[]): MonthPoint[] {
  const withSats = contributions.filter(c => c.sats_purchased && c.sats_purchased > 0)
  if (withSats.length === 0) return []

  const sorted = [...withSats].sort((a, b) => a.contribution_date.localeCompare(b.contribution_date))

  // Collect unique YYYY-MM in order
  const ymSet = new Set<string>()
  for (const c of sorted) {
    const d = new Date(c.contribution_date + 'T00:00:00')
    ymSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Fill every month between first and last (including months with no contributions)
  const yms = Array.from(ymSet)
  const [y0, m0] = yms[0].split('-').map(Number)
  const [y1, m1] = yms[yms.length - 1].split('-').map(Number)
  const allYms: string[] = []
  let cy = y0, cm = m0
  while (cy < y1 || (cy === y1 && cm <= m1)) {
    allYms.push(`${cy}-${String(cm).padStart(2, '0')}`)
    cm++; if (cm > 12) { cm = 1; cy++ }
  }

  let cumSats = 0, cumBrl = 0
  return allYms.map(ym => {
    const [y, m] = ym.split('-').map(Number)
    const endOfMonth = new Date(y, m, 0)
    const monthContribs = withSats.filter(c => {
      const d = new Date(c.contribution_date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() + 1 === m
    })
    const monthSats = monthContribs.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
    const monthBrl  = contributions.filter(c => {
      const d = new Date(c.contribution_date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() + 1 === m
    }).reduce((s, c) => s + c.amount, 0)

    cumSats += monthSats
    const allCumContribs = contributions.filter(c => {
      const d = new Date(c.contribution_date + 'T00:00:00')
      return d <= endOfMonth
    })
    cumBrl = allCumContribs.reduce((s, c) => s + c.amount, 0)

    const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`

    return { label, cumBtc: cumSats / 1e8, cumBrl, monthBrl, monthBtc: monthSats / 1e8 }
  })
}

function fmtBTC4(n: number) {
  return n.toFixed(4).replace(/\.?0+$/, '') + ' BTC'
}

function fmtK(n: number) {
  if (n >= 1_000_000) return 'R$' + (n / 1_000_000).toFixed(2).replace('.', ',') + 'M'
  if (n >= 1_000)     return 'R$' + Math.round(n / 1_000) + 'k'
  return 'R$' + n.toFixed(0)
}

interface Props {
  contributions: DcaContributionRow[]
}

export default function DcaPatrimonyChart({ contributions }: Props) {
  const data = buildChartData(contributions)
  if (data.length === 0) return null

  // SVG dimensions
  const W = 640, H = 220
  const pad = { top: 20, right: 20, bottom: 40, left: 56 }
  const plotW = W - pad.left - pad.right
  const plotH = H - pad.top - pad.bottom

  const BAR_ZONE  = plotH * 0.30  // bottom 30%: monthly BRL bars
  const GAP_ZONE  = plotH * 0.04  // tiny separator
  const AREA_ZONE = plotH * 0.66  // top 66%: cumBTC area

  const areaTop = pad.top
  const areaBot = pad.top + AREA_ZONE
  const barTop  = areaBot + GAP_ZONE
  const barBot  = H - pad.bottom

  const n = data.length
  const slotW = plotW / n

  const maxCumBtc  = Math.max(...data.map(d => d.cumBtc))
  const maxMonthBrl = Math.max(...data.map(d => d.monthBrl))

  // Area path for cumulative BTC
  const pts = data.map((d, i) => {
    const x = pad.left + (i + 0.5) * slotW
    const y = areaBot - (d.cumBtc / maxCumBtc) * AREA_ZONE
    return { x, y }
  })

  const areaPath = pts.length > 0
    ? `M${pad.left},${areaBot} ` +
      pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L${pad.left + plotW},${areaBot} Z`
    : ''

  const linePath = pts.length > 0
    ? `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} ` +
      pts.slice(1).map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    : ''

  // Y axis ticks for cumBtc
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    val: maxCumBtc * f,
    y:   areaBot - f * AREA_ZONE,
  }))

  // X axis: show label every N months to avoid crowding
  const labelStep = n > 8 ? 2 : 1

  const ORANGE = '#F7931A'
  const ORANGE_DIM = 'rgba(247,147,26,0.15)'
  const BLUE   = 'rgba(99,102,241,0.65)'

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      marginBottom: '24px',
      overflow:     'hidden',
    }}>
      {/* Header */}
      <div style={{
        display:         'flex',
        justifyContent:  'space-between',
        alignItems:      'center',
        padding:         '14px 20px',
        borderBottom:    '1px solid var(--border-dim)',
      }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Evolução do patrimônio
        </span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <LegendDot color={ORANGE} label="BTC acumulado" />
          <LegendDot color={BLUE} label="Aporte mensal" />
        </div>
      </div>

      {/* SVG Chart */}
      <div style={{ padding: '8px 0 0' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          aria-label="Evolução do patrimônio em BTC"
        >
          <defs>
            <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={ORANGE} stopOpacity="0.30" />
              <stop offset="100%" stopColor={ORANGE} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Y axis grid lines + labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={pad.left} y1={t.y}
                x2={pad.left + plotW} y2={t.y}
                stroke="var(--border-dim)" strokeWidth="1" strokeDasharray={i === 0 ? 'none' : '3,4'}
              />
              {i > 0 && (
                <text
                  x={pad.left - 6} y={t.y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="var(--text-muted)"
                  fontFamily="'Courier New', monospace"
                >
                  {fmtBTC4(t.val)}
                </text>
              )}
            </g>
          ))}

          {/* BRL bar divider line */}
          <line
            x1={pad.left} y1={barTop - 2}
            x2={pad.left + plotW} y2={barTop - 2}
            stroke="var(--border-dim)" strokeWidth="1"
          />

          {/* Monthly BRL bars */}
          {data.map((d, i) => {
            const bh  = maxMonthBrl > 0 ? (d.monthBrl / maxMonthBrl) * (barBot - barTop - 4) : 0
            const bx  = pad.left + i * slotW + slotW * 0.15
            const bw  = slotW * 0.70
            const by  = barBot - bh
            return (
              <g key={`bar-${i}`}>
                <rect
                  x={bx} y={by} width={bw} height={bh}
                  fill={BLUE} rx="2"
                />
                {bh > 14 && (
                  <text
                    x={bx + bw / 2} y={barBot - 2}
                    textAnchor="middle"
                    fontSize="7"
                    fill="rgba(255,255,255,0.6)"
                    fontFamily="'Courier New', monospace"
                  >
                    {fmtK(d.monthBrl)}
                  </text>
                )}
              </g>
            )
          })}

          {/* BTC area fill */}
          <path d={areaPath} fill="url(#btcGrad)" />

          {/* BTC area line */}
          <path d={linePath} fill="none" stroke={ORANGE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

          {/* BTC dots */}
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill={ORANGE} />
          ))}

          {/* Latest BTC value label */}
          {pts.length > 0 && (() => {
            const last = pts[pts.length - 1]
            const d    = data[data.length - 1]
            return (
              <text
                x={Math.min(last.x + 4, pad.left + plotW - 4)}
                y={Math.max(last.y - 6, areaTop + 10)}
                fontSize="9"
                fill={ORANGE}
                fontWeight="700"
                fontFamily="'Courier New', monospace"
                textAnchor={last.x > pad.left + plotW * 0.75 ? 'end' : 'start'}
              >
                {fmtBTC4(d.cumBtc)}
              </text>
            )
          })()}

          {/* X axis labels */}
          {data.map((d, i) => {
            if (i % labelStep !== 0 && i !== data.length - 1) return null
            const x = pad.left + (i + 0.5) * slotW
            return (
              <text
                key={i}
                x={x} y={H - 4}
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-muted)"
              >
                {d.label}
              </text>
            )
          })}

          {/* Y axis label */}
          <text
            x={14} y={areaBot - AREA_ZONE / 2}
            textAnchor="middle"
            fontSize="8"
            fill="var(--text-muted)"
            transform={`rotate(-90, 14, ${areaBot - AREA_ZONE / 2})`}
          >
            BTC
          </text>
        </svg>
      </div>

      {/* Footer summary */}
      <div style={{
        display:      'flex',
        gap:          '24px',
        padding:      '10px 20px 14px',
        borderTop:    '1px solid var(--border-dim)',
        flexWrap:     'wrap',
      }}>
        {(() => {
          const last = data[data.length - 1]
          const totalBrl = last?.cumBrl ?? 0
          const totalBtc = last?.cumBtc ?? 0
          const firstMonth = data[0]?.label ?? ''
          const lastMonth  = last?.label ?? ''
          return (
            <>
              <FooterStat label="BTC acumulado" value={fmtBTC4(totalBtc)} color={ORANGE} />
              <FooterStat label="Total investido" value={fmtK(totalBrl)} color="var(--orange)" />
              <FooterStat label="Período" value={`${firstMonth} → ${lastMonth}`} />
            </>
          )
        })()}
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

function FooterStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
    </div>
  )
}
