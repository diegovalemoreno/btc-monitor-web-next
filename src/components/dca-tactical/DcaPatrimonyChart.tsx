'use client'

import type { DcaContributionRow } from '@/lib/db/types'

interface MonthBar {
  label:    string   // "07/2025"
  ym:       string   // "2025-07"
  compras:  number   // BRL sum of purchases
  vendas:   number   // BRL sum of sales (positive)
}

function isVenda(c: DcaContributionRow) {
  return c.notes?.includes('Venda') || false
}

function buildBarData(contributions: DcaContributionRow[]): MonthBar[] {
  if (contributions.length === 0) return []

  // Collect all YYYY-MM present
  const ymSet = new Set<string>()
  for (const c of contributions) {
    const d = new Date(c.contribution_date + 'T00:00:00')
    ymSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Fill gap months between first and last
  const sorted = Array.from(ymSet).sort()
  const [y0, m0] = sorted[0].split('-').map(Number)
  const [y1, m1] = sorted[sorted.length - 1].split('-').map(Number)
  const allYms: string[] = []
  let cy = y0, cm = m0
  while (cy < y1 || (cy === y1 && cm <= m1)) {
    allYms.push(`${cy}-${String(cm).padStart(2, '0')}`)
    cm++; if (cm > 12) { cm = 1; cy++ }
  }

  return allYms.map(ym => {
    const [y, m] = ym.split('-').map(Number)
    const month = contributions.filter(c => {
      const d = new Date(c.contribution_date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() + 1 === m
    })
    const compras = month.filter(c => !isVenda(c)).reduce((s, c) => s + c.amount, 0)
    const vendas  = month.filter(c =>  isVenda(c)).reduce((s, c) => s + c.amount, 0)
    const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
    return { label, ym, compras, vendas }
  })
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return `${Math.round(n)}`
}

interface Props {
  contributions: DcaContributionRow[]
}

export default function DcaPatrimonyChart({ contributions }: Props) {
  const data = buildBarData(contributions)
  if (data.length === 0) return null

  // SVG layout
  const W = 700, H = 240
  const pad = { top: 44, right: 20, bottom: 48, left: 62 }
  const plotW = W - pad.left - pad.right
  const plotH = H - pad.top - pad.bottom

  const maxVal = Math.max(...data.map(d => Math.max(d.compras, d.vendas)), 1)
  // Round up Y axis max to nice number
  const yMax  = Math.ceil(maxVal / 1000) * 1000
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    val: yMax * f,
    y:   pad.top + plotH - f * plotH,
  }))

  const n = data.length
  const slotW = plotW / n
  const barW  = Math.min(slotW * 0.55, 32)
  const zeroY = pad.top + plotH

  const GREEN  = '#22C55E'
  const PINK   = '#F87171'
  const GREEN_DIM = 'rgba(34,197,94,0.15)'
  const PINK_DIM  = 'rgba(248,113,113,0.15)'

  // Label step to avoid crowding
  const labelStep = n > 18 ? 4 : n > 12 ? 2 : n > 8 ? 2 : 1

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
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '14px 20px 0',
      }}>
        <span style={{
          fontSize:      '13px',
          fontWeight:    600,
          color:         'var(--text)',
        }}>
          Consolidação de aportes
        </span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <LegendDot color={GREEN} label="Compras" />
          <LegendDot color={PINK}  label="Vendas"  />
        </div>
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        aria-label="Consolidação de aportes por mês"
      >
        {/* Y grid + labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={pad.left} y1={t.y}
              x2={pad.left + plotW} y2={t.y}
              stroke={i === 0 ? 'var(--border)' : 'var(--border-dim)'}
              strokeWidth={i === 0 ? 1.5 : 1}
              strokeDasharray={i === 0 ? 'none' : '3,5'}
            />
            <text
              x={pad.left - 8} y={t.y + 4}
              textAnchor="end"
              fontSize="9"
              fill="var(--text-muted)"
            >
              {t.val === 0 ? '0' : `R$${fmtK(t.val)}`}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const cx    = pad.left + (i + 0.5) * slotW
          const bx    = cx - barW / 2

          // Compras bar (green, up from zero)
          const ch = (d.compras / yMax) * plotH
          const cy = zeroY - ch

          // Vendas bar (pink, down from zero)
          const vh = (d.vendas / yMax) * plotH
          const vy = zeroY

          return (
            <g key={d.ym}>
              {d.compras > 0 && (
                <rect x={bx} y={cy} width={barW} height={Math.max(ch, 1)} fill={GREEN} rx="2" opacity="0.85" />
              )}
              {d.vendas > 0 && (
                <rect x={bx} y={vy} width={barW} height={Math.max(vh, 1)} fill={PINK} rx="2" opacity="0.85" />
              )}
            </g>
          )
        })}

        {/* X axis labels */}
        {data.map((d, i) => {
          if (i % labelStep !== 0 && i !== data.length - 1) return null
          const cx = pad.left + (i + 0.5) * slotW
          return (
            <text
              key={d.ym}
              x={cx}
              y={H - 8}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-muted)"
            >
              {d.label}
            </text>
          )
        })}

        {/* Zero line */}
        <line
          x1={pad.left} y1={zeroY}
          x2={pad.left + plotW} y2={zeroY}
          stroke="var(--border)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Footer totals */}
      <div style={{
        display:      'flex',
        gap:          '24px',
        padding:      '4px 20px 14px',
        flexWrap:     'wrap',
        borderTop:    '1px solid var(--border-dim)',
      }}>
        {(() => {
          const totalCompras = data.reduce((s, d) => s + d.compras, 0)
          const totalVendas  = data.reduce((s, d) => s + d.vendas,  0)
          const months = data.filter(d => d.compras > 0 || d.vendas > 0).length
          return (
            <>
              <FooterStat label="Total compras"  value={`R$ ${fmtK(totalCompras)}`}  color={GREEN} />
              {totalVendas > 0 && <FooterStat label="Total vendas" value={`R$ ${fmtK(totalVendas)}`} color={PINK} />}
              <FooterStat label="Meses ativos"   value={`${months}`} />
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
      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} />
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

function FooterStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ paddingTop: '10px' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
    </div>
  )
}
