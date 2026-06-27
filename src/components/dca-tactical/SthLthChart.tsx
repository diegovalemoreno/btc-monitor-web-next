'use client'

import { useState, useEffect, useMemo, useRef } from 'react'

interface SthLthPoint {
  date:    string
  sthUsd:  number
  lthUsd:  number
  spotUsd: number
  sthBrl:  number
  lthBrl:  number
  spotBrl: number
}

type Period   = '3M' | '6M' | '12M' | 'Todos' | 'custom'
type Currency = 'USD' | 'BRL'

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

const PRESETS: { id: Period; label: string }[] = [
  { id: '3M',     label: 'Últimos 3 meses'     },
  { id: '6M',     label: 'Últimos 6 meses'     },
  { id: '12M',    label: 'Últimos 12 meses'    },
  { id: 'Todos',  label: 'Todo o período'      },
  { id: 'custom', label: 'Período personalizado' },
]

interface TooltipState { date: string; sth: number; lth: number; spot: number; x: number; y: number }

export default function SthLthChart() {
  const [period,       setPeriod]       = useState<Period>('Todos')
  const [customFrom,   setCustomFrom]   = useState('')
  const [customTo,     setCustomTo]     = useState('')
  const [pendingFrom,  setPendingFrom]  = useState('')
  const [pendingTo,    setPendingTo]    = useState('')
  const [currency,     setCurrency]     = useState<Currency>('USD')
  const [data,         setData]         = useState<SthLthPoint[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [containerW,   setContainerW]   = useState(800)
  const [tooltip,      setTooltip]      = useState<TooltipState | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef  = useRef<HTMLDivElement>(null)

  function loadData() {
    setLoading(true)
    setError(null)
    fetch('/api/sth-lth-prices')
      .then(r => r.ok ? r.json() : Promise.reject(`Erro ${r.status}`))
      .then((d: { data: SthLthPoint[] }) => setData(d.data))
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(entries => setContainerW(entries[0].contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!showDropdown) return
    const close = (e: MouseEvent | TouchEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [showDropdown])

  const filteredData = useMemo(() => {
    if (!data.length) return []
    if (period === 'custom') {
      return data.filter(p =>
        (!customFrom || p.date >= customFrom) &&
        (!customTo   || p.date <= customTo)
      )
    }
    if (period === 'Todos') return data
    const months = period === '3M' ? 3 : period === '6M' ? 6 : 12
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - months)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return data.filter(p => p.date >= cutoffStr)
  }, [data, period, customFrom, customTo])

  const H      = 300
  const pad    = { top: 20, right: 80, bottom: 36, left: 20 }
  const plotW  = Math.max(containerW - pad.left - pad.right, 100)
  const plotH  = H - pad.top - pad.bottom

  const sthKey  = currency === 'USD' ? 'sthUsd'  : 'sthBrl'
  const lthKey  = currency === 'USD' ? 'lthUsd'  : 'lthBrl'
  const spotKey = currency === 'USD' ? 'spotUsd' : 'spotBrl'
  const prefix  = currency === 'USD' ? '$' : 'R$'

  const allPrices = filteredData.flatMap(p => [p[sthKey], p[lthKey], p[spotKey]])
  const priceMin  = allPrices.length > 0 ? Math.min(...allPrices) * 0.88 : 0
  const priceMax  = allPrices.length > 0 ? Math.max(...allPrices) * 1.08 : 1
  const pRange    = priceMax - priceMin || 1

  const toY = (p: number) => pad.top + plotH - ((p - priceMin) / pRange) * plotH
  const toX = (i: number) => pad.left + (i / Math.max(filteredData.length - 1, 1)) * plotW

  const pts = (key: keyof SthLthPoint) =>
    filteredData.length > 1
      ? filteredData.map((p, i) => `${toX(i).toFixed(1)},${toY(p[key] as number).toFixed(1)}`).join(' ')
      : ''

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    price: priceMin + t * pRange,
    y:     pad.top + plotH - t * plotH,
  }))

  const xLabels: { text: string; x: number }[] = []
  if (filteredData.length > 1) {
    const n = filteredData.length
    const isLong   = period === 'Todos'  || (period === 'custom' && n > 365)
    const isMedium = period === '12M'    || (period === 'custom' && n > 90 && n <= 365)
    let lastKey = ''
    filteredData.forEach((p, i) => {
      const [y, m] = p.date.split('-').map(Number)
      let key = '', label = ''
      if (isLong) {
        if (m === 1) { key = String(y); label = String(y) }
      } else if (isMedium) {
        if (m === 1 || m === 4 || m === 7 || m === 10) {
          key = `${y}-${m}`; label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
        }
      } else {
        if (i === 0 || filteredData[i - 1].date.slice(5, 7) !== p.date.slice(5, 7)) {
          key = `${y}-${m}`; label = `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`
        }
      }
      if (key && key !== lastKey) { lastKey = key; xLabels.push({ text: label, x: toX(i) }) }
    })
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!filteredData.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx   = e.clientX - rect.left - pad.left
    const idx  = Math.round((mx / plotW) * (filteredData.length - 1))
    const i    = Math.max(0, Math.min(idx, filteredData.length - 1))
    const p    = filteredData[i]
    setTooltip({
      date: p.date, sth: p[sthKey], lth: p[lthKey], spot: p[spotKey],
      x: toX(i), y: toY(p[spotKey]),
    })
  }

  const activeLabel = PRESETS.find(p => p.id === period)?.label ?? 'Todo o período'

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '20px 24px 14px' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '12px' }}>
          STH / LTH Realized Price
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
            <LegendItem color="#22D3EE"          label="STH Realized Price" />
            <LegendItem color="var(--orange)"    label="LTH Realized Price" />
            <LegendItem color="var(--text-sec)"  label="BTC Spot" opacity={0.5} />
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>

            {/* Period dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowDropdown(v => !v)}
                style={{ padding: '5px 12px', background: 'var(--surface3)', border: '1px solid var(--border-strong)', borderRadius: '6px', color: 'var(--text)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}
              >
                {activeLabel}
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>▾</span>
              </button>
              {showDropdown && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 200, minWidth: '200px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                  {PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setPeriod(p.id)
                        setShowDropdown(false)
                        if (p.id === 'custom') { setPendingFrom(customFrom); setPendingTo(customTo) }
                      }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', background: period === p.id ? 'var(--orange-subtle)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border-dim)', color: period === p.id ? 'var(--orange)' : 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Currency toggle */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {(['USD', 'BRL'] as Currency[]).map(c => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  style={{ padding: '4px 11px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: currency === c ? '1px solid var(--border-strong)' : '1px solid transparent', background: currency === c ? 'var(--surface3)' : 'transparent', color: currency === c ? 'var(--text)' : 'var(--text-muted)', transition: 'all 0.12s' }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom date panel */}
      {period === 'custom' && (
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-dim)', display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>Data inicial</label>
            <input type="date" value={pendingFrom} onChange={e => setPendingFrom(e.target.value)} style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', paddingBottom: '8px' }}>até</span>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>Data final</label>
            <input type="date" value={pendingTo} onChange={e => setPendingTo(e.target.value)} style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '13px' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setPeriod('Todos'); setPendingFrom(''); setPendingTo('') }} style={{ padding: '7px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}>Limpar</button>
            <button onClick={() => { setCustomFrom(pendingFrom); setCustomTo(pendingTo) }} style={{ padding: '7px 16px', background: 'var(--orange)', border: 'none', borderRadius: '6px', color: '#000', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Aplicar</button>
          </div>
        </div>
      )}

      {/* Chart */}
      <div ref={containerRef} style={{ position: 'relative', cursor: loading || error ? 'default' : 'crosshair' }} onMouseLeave={() => setTooltip(null)}>
        {loading ? (
          <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Carregando dados STH/LTH…
          </div>
        ) : error ? (
          <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <span>Erro ao carregar dados STH/LTH.</span>
            <button onClick={loadData} style={{ padding: '6px 14px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px', cursor: 'pointer' }}>Tentar novamente</button>
          </div>
        ) : filteredData.length < 2 ? (
          <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Sem dados para o período selecionado.
          </div>
        ) : (
          <svg width={containerW} height={H} style={{ display: 'block', overflow: 'visible' }} onMouseMove={handleMouseMove}>

            {/* Y grid + labels */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={pad.left} y1={t.y} x2={pad.left + plotW} y2={t.y}
                  stroke="var(--border-dim)" strokeWidth="0.5" strokeDasharray="3,8" opacity="0.6" />
                <text x={pad.left + plotW + 7} y={t.y + 4} textAnchor="start" fontSize="9" fill="var(--text-muted)" fontFamily="monospace">
                  {prefix}{fmtK(t.price)}
                </text>
              </g>
            ))}

            {/* Spot (grey, behind) */}
            <polyline points={pts(spotKey)} fill="none" stroke="var(--text-sec)" strokeWidth="1.2" strokeLinejoin="round" opacity="0.5" />

            {/* LTH (orange) */}
            <polyline points={pts(lthKey)} fill="none" stroke="var(--orange)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />

            {/* STH (cyan) */}
            <polyline points={pts(sthKey)} fill="none" stroke="#22D3EE" strokeWidth="1.5" strokeLinejoin="round" opacity="0.9" />

            {/* Tooltip crosshair */}
            {tooltip && (
              <line x1={tooltip.x} y1={pad.top} x2={tooltip.x} y2={pad.top + plotH}
                stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3,4" />
            )}

            {/* X axis labels */}
            {xLabels.map((l, i) => (
              <text key={i} x={l.x} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="monospace">
                {l.text}
              </text>
            ))}
          </svg>
        )}

        {/* Tooltip popup */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left:     tooltip.x + 200 > containerW ? tooltip.x - 202 : tooltip.x + 12,
            top:      Math.max(8, tooltip.y - 60),
            background:   'var(--surface)',
            border:       '1px solid var(--border-strong)',
            borderRadius: '10px',
            padding:      '10px 14px',
            pointerEvents:'none',
            zIndex:       20,
            minWidth:     '188px',
            boxShadow:    '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              {new Date(tooltip.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <TRow label="STH Realized" value={`${prefix}${fmtK(tooltip.sth)}`}  color="#22D3EE" />
            <TRow label="LTH Realized" value={`${prefix}${fmtK(tooltip.lth)}`}  color="var(--orange)" />
            <TRow label="BTC Spot"     value={`${prefix}${fmtK(tooltip.spot)}`} color="var(--text-sec)" />
          </div>
        )}
      </div>
    </div>
  )
}

function LegendItem({ color, label, opacity }: { color: string; label: string; opacity?: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <svg width="20" height="10" style={{ display: 'block' }}>
        <line x1="0" y1="5" x2="20" y2="5" stroke={color} strokeWidth="1.5" opacity={opacity ?? 1} />
      </svg>
      {label}
    </span>
  )
}

function TRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '3px' }}>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{label}</span>
      <strong style={{ fontSize: '11px', color, fontFamily: 'monospace' }}>{value}</strong>
    </div>
  )
}
