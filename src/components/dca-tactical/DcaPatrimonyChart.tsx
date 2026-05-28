'use client'

import { useState, useMemo } from 'react'
import type { DcaContributionRow } from '@/lib/db/types'

type Period = '3M' | '6M' | '12M' | 'Todos'
const PERIODS: Period[] = ['3M', '6M', '12M', 'Todos']

interface MonthData {
  label:       string
  ym:          string
  compras:     number
  vendas:      number
  cumAvgPrice: number | null
}

function isVenda(c: DcaContributionRow) {
  return c.notes?.includes('Venda') || false
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return `${Math.round(n)}`
}

function fmtBRL(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

function niceMax(val: number): number {
  if (val <= 0) return 1000
  const mag  = Math.pow(10, Math.floor(Math.log10(val)))
  const n    = val / mag
  const nice = n <= 1.5 ? 2 : n <= 3 ? 4 : n <= 6 ? 8 : 10
  return nice * mag
}

function smartTicks(max: number, count: number): number[] {
  const step = max / count
  return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i))
}

function buildChartData(contributions: DcaContributionRow[], period: Period): MonthData[] {
  if (contributions.length === 0) return []

  const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

  // All purchases for cumulative avg calc
  const allPurchases = contributions
    .filter(c => !isVenda(c) && (c.sats_purchased ?? 0) > 0)
    .sort((a, b) => a.contribution_date.localeCompare(b.contribution_date))

  // Full month range from all contributions
  const ymSet = new Set<string>()
  for (const c of contributions) {
    const d = new Date(c.contribution_date + 'T00:00:00')
    ymSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const allYms = Array.from(ymSet).sort()

  // Apply period filter
  let cutoffYm: string | null = null
  if (period !== 'Todos') {
    const months = period === '3M' ? 2 : period === '6M' ? 5 : 11
    const d = new Date(); d.setMonth(d.getMonth() - months)
    cutoffYm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const displayedYms = cutoffYm ? allYms.filter(ym => ym >= cutoffYm!) : allYms
  if (displayedYms.length === 0) return []

  return displayedYms.map(ym => {
    const [y, m] = ym.split('-').map(Number)
    const endDate = `${ym}-31`

    const monthContribs = contributions.filter(c => {
      const d = new Date(c.contribution_date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() + 1 === m
    })

    // Cumulative avg price from ALL history up to end of this month
    const cumPurchases = allPurchases.filter(c => c.contribution_date <= endDate)
    const cumBRL  = cumPurchases.reduce((s, c) => s + c.amount, 0)
    const cumSats = cumPurchases.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
    const cumAvgPrice = cumSats > 0 ? cumBRL / (cumSats / 1e8) : null

    return {
      label:       `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`,
      ym,
      compras:     monthContribs.filter(c => !isVenda(c)).reduce((s, c) => s + c.amount, 0),
      vendas:      monthContribs.filter(c =>  isVenda(c)).reduce((s, c) => s + c.amount, 0),
      cumAvgPrice,
    }
  })
}

interface TooltipState {
  label: string; ym: string
  compras: number; vendas: number
  cumAvgPrice: number | null
  x: number; y: number
}

interface Props { contributions: DcaContributionRow[]; compact?: boolean }

export default function DcaPatrimonyChart({ contributions, compact }: Props) {
  const [period,    setPeriod]    = useState<Period>('6M')
  const [tooltip,   setTooltip]   = useState<TooltipState | null>(null)
  const [hoveredYm, setHoveredYm] = useState<string | null>(null)
  const [mousePos,  setMousePos]  = useState({ x: 0, y: 0 })

  const data = useMemo(() => buildChartData(contributions, period), [contributions, period])

  if (data.length === 0) return null

  const n       = data.length
  const BAR_SLOT = Math.max(28, Math.min(56, 680 / n))
  const W        = Math.max(600, n * BAR_SLOT + 120)
  const H        = compact ? 180 : 264
  const pad      = { top: 28, right: 68, bottom: 42, left: 58 }
  const plotW    = W - pad.left - pad.right
  const plotH    = H - pad.top - pad.bottom

  // Left axis (bars — BRL)
  const maxVal  = Math.max(...data.map(d => Math.max(d.compras, d.vendas)), 1)
  const yMax    = niceMax(maxVal)
  const yTicks  = smartTicks(yMax, 4).map(val => ({ val, y: pad.top + plotH - (val / yMax) * plotH }))
  const slotW   = plotW / n
  const barW    = Math.min(slotW * 0.52, 38)
  const zeroY   = pad.top + plotH

  // Right axis (price line)
  const prices     = data.map(d => d.cumAvgPrice).filter((p): p is number => p !== null)
  const priceMin   = prices.length > 0 ? Math.min(...prices) * 0.92 : 0
  const priceMax   = prices.length > 0 ? Math.max(...prices) * 1.08 : 1
  const priceRange = priceMax - priceMin || 1

  function priceToY(p: number) {
    return pad.top + plotH - ((p - priceMin) / priceRange) * plotH
  }

  // Build price polyline points
  const pricePoints = data
    .map((d, i) => d.cumAvgPrice !== null ? `${pad.left + (i + 0.5) * slotW},${priceToY(d.cumAvgPrice)}` : null)
    .filter(Boolean) as string[]

  const totalCompras = data.reduce((s, d) => s + d.compras, 0)
  const totalVendas  = data.reduce((s, d) => s + d.vendas,  0)
  const labelStep    = n > 30 ? 6 : n > 20 ? 4 : n > 12 ? 3 : n > 8 ? 2 : 1

  const priceTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    val: priceMin + t * priceRange,
    y:   pad.top + plotH - t * plotH,
  }))

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '14px',
      marginBottom: '24px',
      overflow:     'hidden',
    }}>

      {/* Header */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              Evolução dos aportes e preço médio
            </span>
          </div>
          <div style={{ display: 'flex', gap: '14px', marginTop: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 8, borderRadius: '2px', background: '#22C55E', display: 'inline-block' }} />
              Aportes
              <strong style={{ color: '#22C55E', fontFamily: 'monospace', marginLeft: 2 }}>R$ {fmtK(totalCompras)}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 2, borderRadius: '1px', background: 'var(--orange)', display: 'inline-block' }} />
              Preço médio
            </span>
            {totalVendas > 0 && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 8, borderRadius: '2px', background: '#F87171', display: 'inline-block' }} />
                Vendas
              </span>
            )}
          </div>
        </div>

        {/* Period buttons */}
        <div style={{ display: 'flex', gap: '3px' }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding:      '4px 11px',
                borderRadius: '6px',
                fontSize:     '11px',
                fontWeight:   600,
                cursor:       'pointer',
                border:       period === p ? '1px solid var(--border-strong)' : '1px solid transparent',
                background:   period === p ? 'var(--surface3)' : 'transparent',
                color:        period === p ? 'var(--text)' : 'var(--text-muted)',
                transition:   'all 0.12s',
              }}
            >
              {p === 'Todos' ? 'Todo período' : `Últimos ${p}`}
            </button>
          ))}
        </div>
      </div>

      {/* Chart — scrollable on mobile */}
      <div
        style={{ overflowX: 'auto', position: 'relative', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setTooltip(null); setHoveredYm(null) }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: `${W}px`, height: `${H}px` }}>
          <defs>
            <linearGradient id="dca-grad-green" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#22C55E" stopOpacity="1"   />
              <stop offset="100%" stopColor="#15803D" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="dca-grad-green-hov" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#4ADE80" stopOpacity="1"   />
              <stop offset="100%" stopColor="#22C55E" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="dca-grad-pink" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#F87171" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#B91C1C" stopOpacity="0.7" />
            </linearGradient>
            <filter id="dca-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Y grid (left) */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={pad.left} y1={t.y} x2={pad.left + plotW} y2={t.y}
                stroke="var(--border-dim)" strokeWidth={t.val === 0 ? 1.5 : 0.7}
                strokeDasharray={t.val === 0 ? 'none' : '3,8'}
              />
              <text x={pad.left - 7} y={t.y + 4} textAnchor="end" fontSize="9" fill="var(--text-muted)">
                {t.val === 0 ? '0' : `R$${fmtK(t.val)}`}
              </text>
            </g>
          ))}

          {/* Right axis ticks (price) */}
          {pricePoints.length > 0 && priceTicks.filter((_, i) => i % 2 === 0).map((t, i) => (
            <text key={i} x={pad.left + plotW + 8} y={t.y + 4}
              textAnchor="start" fontSize="9" fill="var(--orange)" opacity="0.7">
              {fmtK(t.val)}
            </text>
          ))}

          {/* Zero axis */}
          <line x1={pad.left} y1={zeroY} x2={pad.left + plotW} y2={zeroY}
            stroke="var(--border)" strokeWidth="1.5" />

          {/* Bars */}
          {data.map((d, i) => {
            const cx    = pad.left + (i + 0.5) * slotW
            const bx    = cx - barW / 2
            const isHov = hoveredYm === d.ym
            const dimmed = hoveredYm !== null && !isHov
            const ch    = (d.compras / yMax) * plotH
            const vh    = (d.vendas  / yMax) * plotH
            return (
              <g key={d.ym} style={{ cursor: 'pointer' }}
                onMouseEnter={() => { setHoveredYm(d.ym); setTooltip({ label: d.label, ym: d.ym, compras: d.compras, vendas: d.vendas, cumAvgPrice: d.cumAvgPrice, x: cx, y: zeroY - ch }) }}
              >
                {isHov && <rect x={cx - slotW * 0.46} y={pad.top} width={slotW * 0.92} height={plotH + 1} fill="var(--border-dim)" rx="3" />}
                {d.compras > 0 && (
                  <>
                    {isHov && <rect x={bx - 1} y={zeroY - ch - 1} width={barW + 2} height={Math.max(ch, 1) + 2} fill="#22C55E" rx="4" opacity="0.15" filter="url(#dca-glow)" />}
                    <rect x={bx} y={zeroY - ch} width={barW} height={Math.max(ch, 2)}
                      fill={isHov ? 'url(#dca-grad-green-hov)' : 'url(#dca-grad-green)'}
                      rx="3" opacity={dimmed ? 0.2 : 1} />
                  </>
                )}
                {d.vendas > 0 && (
                  <rect x={bx} y={zeroY} width={barW} height={Math.max(vh, 2)}
                    fill="url(#dca-grad-pink)" rx="3" opacity={dimmed ? 0.2 : 1} />
                )}
              </g>
            )
          })}

          {/* Price line */}
          {pricePoints.length >= 2 && (
            <>
              <polyline
                points={pricePoints.join(' ')}
                fill="none"
                stroke="var(--orange)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.9"
              />
              {data.map((d, i) => {
                if (d.cumAvgPrice === null) return null
                const cx  = pad.left + (i + 0.5) * slotW
                const cy  = priceToY(d.cumAvgPrice)
                const isHov = hoveredYm === d.ym
                return (
                  <circle key={d.ym} cx={cx} cy={cy} r={isHov ? 4 : 2.5}
                    fill={isHov ? 'var(--orange)' : 'var(--surface)'}
                    stroke="var(--orange)" strokeWidth={isHov ? 0 : 1.5}
                    opacity={hoveredYm && !isHov ? 0.4 : 1}
                  />
                )
              })}
            </>
          )}

          {/* X labels */}
          {data.map((d, i) => {
            const show  = i % labelStep === 0 || i === data.length - 1
            if (!show) return null
            const cx    = pad.left + (i + 0.5) * slotW
            const isHov = hoveredYm === d.ym
            return (
              <text key={d.ym} x={cx} y={H - 8} textAnchor="middle"
                fontSize="9" fontWeight={isHov ? 700 : 400}
                fill={isHov ? 'var(--orange)' : 'var(--text-muted)'}>
                {d.label}
              </text>
            )
          })}

          {/* Hovered label if not in step */}
          {hoveredYm && (() => {
            const idx = data.findIndex(d => d.ym === hoveredYm)
            if (idx < 0 || idx % labelStep === 0 || idx === data.length - 1) return null
            const cx = pad.left + (idx + 0.5) * slotW
            return <text key="hov-lbl" x={cx} y={H - 8} textAnchor="middle" fontSize="9" fontWeight={700} fill="var(--orange)">{data[idx].label}</text>
          })()}
        </svg>

        {/* Floating tooltip */}
        {tooltip && (
          <div style={{
            position:      'absolute',
            top:           Math.max(8, mousePos.y - 100),
            left:          Math.min(mousePos.x + 14, W - 180),
            background:    'var(--surface)',
            backdropFilter:'blur(10px)',
            border:        '1px solid var(--border-strong)',
            borderRadius:  '10px',
            padding:       '10px 14px',
            pointerEvents: 'none',
            zIndex:        20,
            minWidth:      '160px',
            boxShadow:     '0 8px 24px rgba(0,0,0,0.4)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{tooltip.label}</div>
            {tooltip.compras > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '3px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '2px', background: '#22C55E', display: 'inline-block' }} />
                  Aportes
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#22C55E', fontFamily: 'monospace' }}>{fmtBRL(tooltip.compras)}</span>
              </div>
            )}
            {tooltip.cumAvgPrice !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid var(--border-dim)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span style={{ width: 10, height: 2, borderRadius: '1px', background: 'var(--orange)', display: 'inline-block' }} />
                  Preço médio
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--orange)', fontFamily: 'monospace' }}>R$ {fmtK(tooltip.cumAvgPrice)}/BTC</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
