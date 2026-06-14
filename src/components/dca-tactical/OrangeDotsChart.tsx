'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import type { DcaContributionRow } from '@/lib/db/types'

interface PricePoint { date: string; price: number }
type Period = '1A' | '2A' | '3A' | 'Todos'
const PERIODS: Period[] = ['1A', '2A', '3A', 'Todos']
const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function isVenda(c: DcaContributionRow) { return !!c.notes?.includes('Venda') }

function fmtBRL0(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
}

function fmtBTC(sats: number) {
  const btc = sats / 1e8
  return btc.toFixed(8).replace(/\.?0+$/, '') + ' BTC'
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

interface TooltipState { c: DcaContributionRow; x: number; y: number }

interface Props { contributions: DcaContributionRow[] }

export default function OrangeDotsChart({ contributions }: Props) {
  const [period, setPeriod]           = useState<Period>('Todos')
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [loading, setLoading]         = useState(true)
  const [tooltip, setTooltip]         = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerW, setContainerW]   = useState(800)

  useEffect(() => {
    fetch('/api/btc-price-history')
      .then(r => r.ok ? r.json() : null)
      .then((d: { history?: PricePoint[]; currentPrice?: number } | null) => {
        if (d?.history) {
          setPriceHistory(d.history)
          if (d.currentPrice) setCurrentPrice(d.currentPrice)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => setContainerW(entries[0].contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const purchases = useMemo(
    () => contributions.filter(c => !isVenda(c) && (c.sats_purchased ?? 0) > 0),
    [contributions]
  )

  // All-time stats
  const totalSats     = purchases.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
  const totalInvested = purchases.reduce((s, c) => s + c.amount, 0)
  const avgCostBrl    = totalSats > 0 ? totalInvested / (totalSats / 1e8) : null
  const portfolioVal  = currentPrice !== null ? (totalSats / 1e8) * currentPrice : null
  const gainPct       = portfolioVal !== null && totalInvested > 0
    ? ((portfolioVal - totalInvested) / totalInvested) * 100 : null
  const gainAbs       = portfolioVal !== null ? portfolioVal - totalInvested : null
  const todayLabel    = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

  // Filtered price history
  const filteredHistory = useMemo(() => {
    if (!priceHistory.length) return []
    if (period === 'Todos') return priceHistory
    const years   = period === '1A' ? 1 : period === '2A' ? 2 : 3
    const cutoff  = new Date()
    cutoff.setFullYear(cutoff.getFullYear() - years)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return priceHistory.filter(p => p.date >= cutoffStr)
  }, [priceHistory, period])

  // Visible purchase dots (have btc_price_brl + within period range)
  const visibleDots = useMemo(() => {
    if (!filteredHistory.length) return []
    const minDate = filteredHistory[0].date
    const maxDate = filteredHistory[filteredHistory.length - 1].date
    return purchases.filter(c => c.btc_price_brl && c.contribution_date >= minDate && c.contribution_date <= maxDate)
  }, [purchases, filteredHistory])

  // Cumulative average price line (all-time purchases projected onto period's history)
  const avgLine = useMemo(() => {
    if (!filteredHistory.length) return []
    const sorted = [...purchases]
      .filter(c => (c.sats_purchased ?? 0) > 0)
      .sort((a, b) => a.contribution_date.localeCompare(b.contribution_date))
    let cumBRL = 0, cumSats = 0, pi = 0
    return filteredHistory.map(p => {
      while (pi < sorted.length && sorted[pi].contribution_date <= p.date) {
        cumBRL  += sorted[pi].amount
        cumSats += sorted[pi].sats_purchased!
        pi++
      }
      return cumSats > 0 ? cumBRL / (cumSats / 1e8) : null
    })
  }, [filteredHistory, purchases])

  // Date → index map for O(1) dot x-positioning
  const histDateMap = useMemo(() => {
    const m = new Map<string, number>()
    filteredHistory.forEach((p, i) => m.set(p.date, i))
    return m
  }, [filteredHistory])

  // Chart dimensions
  const H     = 300
  const pad   = { top: 20, right: 80, bottom: 36, left: 20 }
  const plotW = Math.max(containerW - pad.left - pad.right, 100)
  const plotH = H - pad.top - pad.bottom

  // Y scale (price range + padding)
  const allPrices: number[] = [
    ...filteredHistory.map(p => p.price),
    ...avgLine.filter((v): v is number => v !== null),
  ]
  const priceMin = allPrices.length > 0 ? Math.min(...allPrices) * 0.88 : 0
  const priceMax = allPrices.length > 0 ? Math.max(...allPrices) * 1.08 : 1
  const pRange   = priceMax - priceMin || 1

  const toY = (p: number)  => pad.top + plotH - ((p - priceMin) / pRange) * plotH
  const toX = (i: number)  => pad.left + (i / Math.max(filteredHistory.length - 1, 1)) * plotW

  // Dot radius scaled by amount (sqrt for bubble-chart feel)
  const amounts  = visibleDots.map(c => c.amount)
  const minAmt   = amounts.length > 0 ? Math.min(...amounts) : 1
  const maxAmt   = amounts.length > 0 ? Math.max(...amounts) : 1
  const dotR = (amt: number) => {
    const t = maxAmt === minAmt ? 0.5 : Math.sqrt((amt - minAmt) / (maxAmt - minAmt))
    return 4 + t * 16
  }

  function dotXY(c: DcaContributionRow): { x: number; y: number } | null {
    if (!c.btc_price_brl) return null
    let idx = histDateMap.get(c.contribution_date)
    if (idx === undefined) {
      // Find nearest available date
      let bestIdx = -1, bestDiff = Infinity
      for (const [d, i] of histDateMap) {
        const diff = Math.abs(new Date(d).getTime() - new Date(c.contribution_date + 'T12:00:00').getTime())
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i }
      }
      if (bestIdx < 0) return null
      idx = bestIdx
    }
    return { x: toX(idx), y: toY(c.btc_price_brl) }
  }

  // SVG polylines
  const pricePts = filteredHistory.length > 1
    ? filteredHistory.map((p, i) => `${toX(i).toFixed(1)},${toY(p.price).toFixed(1)}`).join(' ')
    : ''

  const avgSegments: string[][] = []
  {
    let seg: string[] = []
    avgLine.forEach((v, i) => {
      if (v !== null) {
        seg.push(`${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
      } else if (seg.length > 0) {
        avgSegments.push(seg); seg = []
      }
    })
    if (seg.length > 0) avgSegments.push(seg)
  }

  // Y axis ticks (right side)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    price: priceMin + t * pRange,
    y:     pad.top + plotH - t * plotH,
  }))

  // X axis labels
  const xLabels: { text: string; x: number }[] = []
  if (filteredHistory.length > 1) {
    let lastKey = ''
    filteredHistory.forEach((p, i) => {
      const [y, m] = p.date.split('-').map(Number)
      let key = '', label = ''
      if (period === 'Todos' || period === '3A') {
        if (m === 1) { key = String(y); label = String(y) }
      } else if (period === '2A') {
        if (m === 1 || m === 4 || m === 7 || m === 10) {
          key = `${y}-${m}`; label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
        }
      } else {
        if (m % 2 === 1 && (i === 0 || filteredHistory[i - 1].date.slice(5, 7) !== String(m).padStart(2, '0'))) {
          key = `${y}-${m}`; label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
        }
      }
      if (key && key !== lastKey) { lastKey = key; xLabels.push({ text: label, x: toX(i) }) }
    })
  }

  const hasData = filteredHistory.length >= 2

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '14px',
      overflow:     'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding:        '20px 24px 12px',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'flex-start',
        gap:            '16px',
        flexWrap:       'wrap',
      }}>
        {/* Left: portfolio stats */}
        <div>
          <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Orange Dots Chart
          </div>
          <div style={{
            fontSize:           '30px',
            fontWeight:         800,
            color:              '#F7931A',
            letterSpacing:      '-1px',
            lineHeight:         1,
            fontVariantNumeric: 'tabular-nums',
            marginBottom:       '8px',
          }}>
            {portfolioVal !== null ? fmtBRL0(portfolioVal) : loading ? '...' : '—'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{fmtBTC(totalSats)}</span>
            <span style={{ color: 'var(--text-sec)' }}>
              Custo médio:{' '}
              <strong style={{ color: 'var(--text)', fontFamily: 'monospace' }}>
                {avgCostBrl !== null ? fmtBRL0(avgCostBrl) : '—'}/BTC
              </strong>
            </span>
            {gainPct !== null && (
              <span style={{ color: gainPct >= 0 ? '#22C55E' : '#EF4444', fontWeight: 700 }}>
                {gainPct >= 0 ? '▲' : '▼'}{' '}
                {gainPct >= 0 ? '+' : ''}{gainPct.toFixed(2).replace('.', ',')}%
                {gainAbs !== null && (
                  <span style={{ fontWeight: 400 }}>
                    {' '}({gainAbs >= 0 ? '+' : ''}{fmtBRL0(gainAbs)})
                  </span>
                )}
              </span>
            )}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Em {todayLabel}</div>
        </div>

        {/* Right: event count + total BTC */}
        <div style={{ display: 'flex', gap: '20px', textAlign: 'right' }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Compras no período
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
              {visibleDots.length}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Total Bitcoin
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#F7931A', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>
              {fmtBTC(totalSats)}
            </div>
          </div>
        </div>
      </div>

      {/* Legend + period selector */}
      <div style={{
        padding:        '0 24px 10px',
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        flexWrap:       'wrap',
        gap:            '8px',
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="20" height="10" style={{ display: 'block' }}>
              <line x1="0" y1="5" x2="20" y2="5" stroke="var(--orange)" strokeWidth="1.5"/>
            </svg>
            Preço do Bitcoin
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="12" height="12" style={{ display: 'block' }}>
              <circle cx="6" cy="6" r="4.5" fill="#F7931A" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2"/>
            </svg>
            Minhas compras
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="20" height="10" style={{ display: 'block' }}>
              <line x1="0" y1="5" x2="20" y2="5" stroke="#22C55E" strokeWidth="1.5" strokeDasharray="5,3"/>
            </svg>
            Preço médio acumulado
          </span>
        </div>

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
              {p === 'Todos' ? 'Todo período' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        style={{ position: 'relative', cursor: tooltip ? 'default' : 'crosshair' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {!hasData ? (
          <div style={{
            height:          H,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            color:           'var(--text-muted)',
            fontSize:        '13px',
          }}>
            {loading ? 'Carregando histórico de preços…' : 'Sem dados suficientes'}
          </div>
        ) : (
          <svg
            width={containerW}
            height={H}
            style={{ display: 'block', overflow: 'visible' }}
          >
            <defs>
              <filter id="odot-glow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Y grid */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line
                  x1={pad.left} y1={t.y}
                  x2={pad.left + plotW} y2={t.y}
                  stroke="var(--border-dim)"
                  strokeWidth="0.5"
                  strokeDasharray="3,8"
                  opacity="0.6"
                />
                <text
                  x={pad.left + plotW + 7} y={t.y + 4}
                  textAnchor="start"
                  fontSize="9"
                  fill="var(--text-muted)"
                  fontFamily="monospace"
                >
                  R${fmtK(t.price)}
                </text>
              </g>
            ))}

            {/* BTC price line */}
            {pricePts && (
              <polyline
                points={pricePts}
                fill="none"
                stroke="var(--orange)"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.85"
              />
            )}

            {/* Avg price dashed line */}
            {avgSegments.map((s, i) => s.length >= 2 && (
              <polyline
                key={i}
                points={s.join(' ')}
                fill="none"
                stroke="#22C55E"
                strokeWidth="1.2"
                strokeDasharray="5,4"
                strokeLinejoin="round"
                opacity="0.8"
              />
            ))}

            {/* Dot glow layer (behind) */}
            {visibleDots.map(c => {
              const pos = dotXY(c)
              if (!pos) return null
              const r = dotR(c.amount)
              return (
                <circle
                  key={c.id + '-g'}
                  cx={pos.x} cy={pos.y}
                  r={r + 4}
                  fill="#F7931A"
                  opacity="0.12"
                  style={{ pointerEvents: 'none' }}
                />
              )
            })}

            {/* Dots */}
            {visibleDots.map(c => {
              const pos = dotXY(c)
              if (!pos) return null
              const r      = dotR(c.amount)
              const isHov  = tooltip?.c.id === c.id
              return (
                <g key={c.id}>
                  {isHov && (
                    <circle
                      cx={pos.x} cy={pos.y}
                      r={r + 6}
                      fill="#F7931A"
                      opacity="0.2"
                      filter="url(#odot-glow)"
                      style={{ pointerEvents: 'none' }}
                    />
                  )}
                  {/* White outer ring */}
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={r + 1.5}
                    fill="none"
                    stroke="rgba(255,255,255,0.22)"
                    strokeWidth="1.5"
                    style={{ pointerEvents: 'none' }}
                  />
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={r}
                    fill="#F7931A"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="0.8"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setTooltip({ c, x: pos.x, y: pos.y })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </g>
              )
            })}

            {/* X axis labels */}
            {xLabels.map((l, i) => (
              <text
                key={i}
                x={l.x} y={H - 6}
                textAnchor="middle"
                fontSize="9"
                fill="var(--text-muted)"
                fontFamily="monospace"
              >
                {l.text}
              </text>
            ))}
          </svg>
        )}

        {/* Hover tooltip */}
        {tooltip && (() => {
          const { c, x, y } = tooltip
          const ttW  = 188
          const ttX  = x + ttW + 20 > containerW ? x - ttW - 10 : x + 12
          const ttY  = Math.max(8, y - 80)
          const date = new Date(c.contribution_date + 'T12:00:00')
            .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
          return (
            <div style={{
              position:      'absolute',
              left:          ttX,
              top:           ttY,
              background:    'var(--surface)',
              border:        '1px solid var(--border-strong)',
              borderRadius:  '10px',
              padding:       '10px 14px',
              pointerEvents: 'none',
              zIndex:        20,
              minWidth:      `${ttW}px`,
              boxShadow:     '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                {date}
              </div>
              <Row label="Investido"  value={fmtBRL0(c.amount)}                              color="var(--orange)" />
              {c.sats_purchased && <Row label="Bitcoin"  value={fmtBTC(c.sats_purchased)}    color="#F7931A"       />}
              {c.btc_price_brl  && <Row label="Preço BTC" value={`${fmtBRL0(c.btc_price_brl)}/BTC`} color="var(--text)" />}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '3px' }}>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</span>
      <strong style={{ fontSize: '11px', color, fontFamily: 'monospace' }}>{value}</strong>
    </div>
  )
}
