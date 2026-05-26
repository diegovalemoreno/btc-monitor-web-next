'use client'

import { useState } from 'react'
import type { DcaContributionRow } from '@/lib/db/types'

interface MonthBar {
  label:   string
  ym:      string
  compras: number
  vendas:  number
}

function isVenda(c: DcaContributionRow) {
  return c.notes?.includes('Venda') || false
}

function buildBarData(contributions: DcaContributionRow[]): MonthBar[] {
  if (contributions.length === 0) return []
  const ymSet = new Set<string>()
  for (const c of contributions) {
    const d = new Date(c.contribution_date + 'T00:00:00')
    ymSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const sorted = Array.from(ymSet).sort()
  const [y0, m0] = sorted[0].split('-').map(Number)
  const [y1, m1] = sorted[sorted.length - 1].split('-').map(Number)
  const allYms: string[] = []
  let cy = y0, cm = m0
  while (cy < y1 || (cy === y1 && cm <= m1)) {
    allYms.push(`${cy}-${String(cm).padStart(2, '0')}`)
    cm++; if (cm > 12) { cm = 1; cy++ }
  }
  const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return allYms.map(ym => {
    const [y, m] = ym.split('-').map(Number)
    const month = contributions.filter(c => {
      const d = new Date(c.contribution_date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() + 1 === m
    })
    return {
      label:   `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`,
      ym,
      compras: month.filter(c => !isVenda(c)).reduce((s, c) => s + c.amount, 0),
      vendas:  month.filter(c =>  isVenda(c)).reduce((s, c) => s + c.amount, 0),
    }
  })
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
  const mag = Math.pow(10, Math.floor(Math.log10(val)))
  const n = val / mag
  const nice = n <= 1.5 ? 2 : n <= 3 ? 4 : n <= 6 ? 8 : 10
  return nice * mag
}

function smartTicks(max: number, count: number): number[] {
  const step = max / count
  return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i))
}

interface TooltipState {
  label:   string
  ym:      string
  compras: number
  vendas:  number
  x:       number
  y:       number
}

interface Props { contributions: DcaContributionRow[]; compact?: boolean }

export default function DcaPatrimonyChart({ contributions, compact }: Props) {
  const [tooltip,    setTooltip]    = useState<TooltipState | null>(null)
  const [hoveredYm,  setHoveredYm]  = useState<string | null>(null)
  const [mousePos,   setMousePos]   = useState({ x: 0, y: 0 })

  const data = buildBarData(contributions)
  if (data.length === 0) return null

  const n          = data.length
  const BAR_SLOT   = Math.max(24, Math.min(52, 700 / n))
  const W          = Math.max(640, n * BAR_SLOT + 84)
  const H          = compact ? 180 : 260
  const pad        = { top: 28, right: 20, bottom: 42, left: 62 }
  const plotW      = W - pad.left - pad.right
  const plotH      = H - pad.top - pad.bottom

  const maxVal     = Math.max(...data.map(d => Math.max(d.compras, d.vendas)), 1)
  const yMax       = niceMax(maxVal)
  const yTicks     = smartTicks(yMax, 4).map(val => ({ val, y: pad.top + plotH - (val / yMax) * plotH }))

  const slotW      = plotW / n
  const barW       = Math.min(slotW * 0.58, 40)
  const zeroY      = pad.top + plotH

  const totalCompras = data.reduce((s, d) => s + d.compras, 0)
  const totalVendas  = data.reduce((s, d) => s + d.vendas,  0)
  const activeMonths = data.filter(d => d.compras > 0 || d.vendas > 0).length

  const labelStep  = n > 30 ? 6 : n > 20 ? 4 : n > 12 ? 3 : n > 8 ? 2 : 1

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
      <div style={{ padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Consolidação de aportes
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {activeMonths} meses ativos · {n} no período
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <LegendPill color="#22C55E" label="Compras" total={totalCompras} />
          {totalVendas > 0 && <LegendPill color="#F87171" label="Vendas" total={totalVendas} />}
        </div>
      </div>

      {/* Chart area — scrollable on mobile */}
      <div
        style={{ overflowX: 'auto', position: 'relative', cursor: 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setTooltip(null); setHoveredYm(null) }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block', width: '100%', minWidth: '480px', height: 'auto' }}
          preserveAspectRatio="none"
        >
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
            <linearGradient id="dca-grad-pink-hov" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#FCA5A5" stopOpacity="1"   />
              <stop offset="100%" stopColor="#F87171" stopOpacity="0.9" />
            </linearGradient>
            <filter id="dca-glow-green" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="dca-glow-pink" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Y grid */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={pad.left} y1={t.y}
                x2={pad.left + plotW} y2={t.y}
                stroke="var(--border-dim)"
                strokeWidth={t.val === 0 ? 1.5 : 0.8}
                strokeDasharray={t.val === 0 ? 'none' : '3,7'}
              />
              <text
                x={pad.left - 8} y={t.y + 4}
                textAnchor="end" fontSize="9.5" fill="var(--text-muted)"
              >
                {t.val === 0 ? '0' : `R$${fmtK(t.val)}`}
              </text>
            </g>
          ))}

          {/* Zero axis */}
          <line
            x1={pad.left} y1={zeroY}
            x2={pad.left + plotW} y2={zeroY}
            stroke="var(--border)" strokeWidth="1.5"
          />

          {/* Bars */}
          {data.map((d, i) => {
            const cx     = pad.left + (i + 0.5) * slotW
            const bx     = cx - barW / 2
            const isHov  = hoveredYm === d.ym
            const dimmed = hoveredYm !== null && !isHov

            const ch = (d.compras / yMax) * plotH
            const vh = (d.vendas  / yMax) * plotH

            return (
              <g
                key={d.ym}
                onMouseEnter={() => {
                  setHoveredYm(d.ym)
                  setTooltip({ label: d.label, ym: d.ym, compras: d.compras, vendas: d.vendas, x: cx, y: zeroY - ch })
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Hover column highlight */}
                {isHov && (
                  <rect
                    x={cx - slotW * 0.48} y={pad.top}
                    width={slotW * 0.96} height={plotH + 1}
                    fill="rgba(255,255,255,0.04)" rx="3"
                  />
                )}

                {/* Compras bar */}
                {d.compras > 0 && (
                  <>
                    {isHov && (
                      <rect
                        x={bx - 1} y={zeroY - ch - 1}
                        width={barW + 2} height={Math.max(ch, 1) + 2}
                        fill="#22C55E" rx="4" opacity="0.2"
                        filter="url(#dca-glow-green)"
                      />
                    )}
                    <rect
                      x={bx} y={zeroY - ch}
                      width={barW} height={Math.max(ch, 2)}
                      fill={isHov ? 'url(#dca-grad-green-hov)' : 'url(#dca-grad-green)'}
                      rx="3"
                      opacity={dimmed ? 0.25 : 1}
                    />
                  </>
                )}

                {/* Vendas bar */}
                {d.vendas > 0 && (
                  <>
                    {isHov && (
                      <rect
                        x={bx - 1} y={zeroY - 1}
                        width={barW + 2} height={Math.max(vh, 1) + 2}
                        fill="#F87171" rx="4" opacity="0.2"
                        filter="url(#dca-glow-pink)"
                      />
                    )}
                    <rect
                      x={bx} y={zeroY}
                      width={barW} height={Math.max(vh, 2)}
                      fill={isHov ? 'url(#dca-grad-pink-hov)' : 'url(#dca-grad-pink)'}
                      rx="3"
                      opacity={dimmed ? 0.25 : 1}
                    />
                  </>
                )}
              </g>
            )
          })}

          {/* X labels */}
          {data.map((d, i) => {
            const show = i % labelStep === 0 || i === data.length - 1
            if (!show) return null
            const cx    = pad.left + (i + 0.5) * slotW
            const isHov = hoveredYm === d.ym
            return (
              <text
                key={d.ym}
                x={cx} y={H - 8}
                textAnchor="middle"
                fontSize="9"
                fontWeight={isHov ? 700 : 400}
                fill={isHov ? 'var(--orange)' : 'var(--text-muted)'}
              >
                {d.label}
              </text>
            )
          })}

          {/* Hovered month label always visible even if not in labelStep */}
          {hoveredYm && (() => {
            const idx = data.findIndex(d => d.ym === hoveredYm)
            if (idx < 0) return null
            const inStep = idx % labelStep === 0 || idx === data.length - 1
            if (inStep) return null
            const cx = pad.left + (idx + 0.5) * slotW
            return (
              <text key="hov-label" x={cx} y={H - 8} textAnchor="middle" fontSize="9" fontWeight={700} fill="var(--orange)">
                {data[idx].label}
              </text>
            )
          })()}
        </svg>

        {/* Floating tooltip */}
        {tooltip && (
          <div
            style={{
              position:      'absolute',
              top:           Math.max(8, mousePos.y - 90),
              left:          Math.min(mousePos.x + 14, 999),
              transform:     mousePos.x > 500 ? 'translateX(-110%)' : 'none',
              background:    'rgba(8,8,8,0.92)',
              backdropFilter:'blur(10px)',
              border:        '1px solid var(--border-strong)',
              borderRadius:  '10px',
              padding:       '10px 14px',
              pointerEvents: 'none',
              zIndex:        20,
              minWidth:      '150px',
              boxShadow:     '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.01em' }}>
              {tooltip.label}
            </div>
            {tooltip.compras > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#22C55E', display: 'inline-block' }} />
                  Compras
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#22C55E', fontFamily: 'monospace' }}>
                  {fmtBRL(tooltip.compras)}
                </span>
              </div>
            )}
            {tooltip.vendas > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#F87171', display: 'inline-block' }} />
                  Vendas
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#F87171', fontFamily: 'monospace' }}>
                  {fmtBRL(tooltip.vendas)}
                </span>
              </div>
            )}
            {tooltip.compras > 0 && tooltip.vendas > 0 && (
              <div style={{
                marginTop: '8px', paddingTop: '8px',
                borderTop: '1px solid var(--border-dim)',
                display: 'flex', justifyContent: 'space-between', gap: '20px',
              }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Líquido</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace' }}>
                  {fmtBRL(tooltip.compras - tooltip.vendas)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function LegendPill({ color, label, total }: { color: string; label: string; total: number }) {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          '7px',
      padding:      '5px 10px',
      background:   `${color}12`,
      border:       `1px solid ${color}30`,
      borderRadius: '20px',
    }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, flexShrink: 0 }} />
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: '11px', fontWeight: 700, color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
        R$ {fmtK(total)}
      </span>
    </div>
  )
}
