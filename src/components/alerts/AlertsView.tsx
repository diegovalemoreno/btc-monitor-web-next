'use client'
import { useState, useMemo, useEffect } from 'react'
import type { AlertEventRow } from '@/lib/db/types'

// ── constants ───────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 25, 50] as const

type PriorityFilter = 'TODAS' | 'ALTA' | 'MÉDIA' | 'BAIXA'

const TYPE_LABEL: Record<string, string> = {
  TACTICAL_OPPORTUNITY:   'Oportunidade tática',
  AGGRESSIVE_OPPORTUNITY: 'Oportunidade agressiva',
  HIGH_RISK:              'Risco elevado',
  EUPHORIA_WARNING:       'Alerta de euforia',
  CAPITULATION_SIGNAL:    'Sinal de capitulação',
  DELEVERAGING_SIGNAL:    'Desalavancagem',
  REGIME_CHANGE:          'Mudança de regime',
}

function getPriority(severity: string): 'ALTA' | 'MÉDIA' | 'BAIXA' {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'ALTA'
  if (severity === 'MEDIUM') return 'MÉDIA'
  return 'BAIXA'
}

const PRIORITY_STYLE = {
  ALTA:  { color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.28)' },
  MÉDIA: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.28)'  },
  BAIXA: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  border: 'rgba(74,222,128,0.28)'  },
}

function toISODate(d: Date) { return d.toISOString().slice(0, 10) }

// ── sub-components ──────────────────────────────────────────────────────────

function SummaryCard({
  label, count, sub, accentColor, icon,
}: {
  label: string; count: number; sub: string; accentColor: string; icon: React.ReactNode
}) {
  return (
    <div style={{
      background:   'var(--surface2)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      padding:      '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: `${accentColor}18`, border: `1px solid ${accentColor}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: accentColor, lineHeight: 1, marginBottom: '4px' }}>
        {count}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}

function AlertRowIcon({ severity }: { severity: string }) {
  const p = getPriority(severity)
  const c = PRIORITY_STYLE[p].color
  if (p === 'ALTA') return (
    <div style={{ width: 34, height: 34, borderRadius: '9px', background: `${c}15`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
  )
  if (p === 'MÉDIA') return (
    <div style={{ width: 34, height: 34, borderRadius: '9px', background: `${c}15`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    </div>
  )
  return (
    <div style={{ width: 34, height: 34, borderRadius: '9px', background: `${c}15`, border: `1px solid ${c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>
  )
}

function PriorityBadge({ severity }: { severity: string }) {
  const p = getPriority(severity)
  const s = PRIORITY_STYLE[p]
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '5px', fontSize: '10px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {p}
    </span>
  )
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d)
  return { date, time }
}

function SelectInput({ value, onChange, children, minWidth }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; minWidth?: number
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '7px 10px', fontSize: '12px', cursor: 'pointer',
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: '8px', color: 'var(--text)', minWidth: minWidth ?? 130,
      }}
    >
      {children}
    </select>
  )
}

// ── main component ──────────────────────────────────────────────────────────

interface Props { alerts: AlertEventRow[] }

export default function AlertsView({ alerts }: Props) {
  const today        = new Date()
  const thirtyAgo    = new Date(today.getTime() - 30 * 86_400_000)

  const [dateFrom, setDateFrom] = useState(toISODate(thirtyAgo))
  const [dateTo,   setDateTo]   = useState(toISODate(today))
  const [priority, setPriority] = useState<PriorityFilter>('TODAS')
  const [typeFilter, setTypeFilter] = useState('TODOS')
  const [search,   setSearch]   = useState('')
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [readIds,  setReadIds]  = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored = localStorage.getItem('btc-alert-read-ids')
      const ids: Set<string> = stored ? new Set(JSON.parse(stored)) : new Set()
      // Auto-mark alerts older than 7 days as read
      const cutoff = Date.now() - 7 * 86_400_000
      for (const a of alerts) {
        if (new Date(a.created_at).getTime() < cutoff) ids.add(a.id)
      }
      setReadIds(new Set(ids))
      localStorage.setItem('btc-alert-read-ids', JSON.stringify([...ids]))
    } catch { /* ignore */ }
  }, [alerts])

  function markRead(id: string) {
    setReadIds(prev => {
      const next = new Set(prev).add(id)
      try { localStorage.setItem('btc-alert-read-ids', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }

  // Summary counts
  const alta  = alerts.filter(a => getPriority(a.severity) === 'ALTA').length
  const media = alerts.filter(a => getPriority(a.severity) === 'MÉDIA').length
  const baixa = alerts.filter(a => getPriority(a.severity) === 'BAIXA').length

  const uniqueTypes = Array.from(new Set(alerts.map(a => a.type))).sort()

  const filtered = useMemo(() => {
    return alerts.filter(a => {
      const dt = new Date(a.created_at)
      if (dateFrom && dt < new Date(dateFrom + 'T00:00:00')) return false
      if (dateTo   && dt > new Date(dateTo   + 'T23:59:59')) return false
      if (priority !== 'TODAS' && getPriority(a.severity) !== priority) return false
      if (typeFilter !== 'TODOS' && a.type !== typeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!a.title.toLowerCase().includes(q) && !a.message.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [alerts, dateFrom, dateTo, priority, typeFilter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  function clearFilters() {
    setDateFrom(toISODate(thirtyAgo))
    setDateTo(toISODate(today))
    setPriority('TODAS')
    setTypeFilter('TODOS')
    setSearch('')
    setPage(1)
  }

  // Pagination helper: show up to 5 page buttons centered on current
  function pageButtons() {
    const count = Math.min(5, totalPages)
    let start = Math.max(1, safePage - 2)
    if (start + count - 1 > totalPages) start = Math.max(1, totalPages - count + 1)
    return Array.from({ length: count }, (_, i) => start + i)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <SummaryCard
          label="Total de alertas" count={alerts.length} sub="Últimos 30 dias" accentColor="#fff"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>}
        />
        <SummaryCard
          label="Alta prioridade" count={alta} sub="Requer atenção" accentColor="#f87171"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
        />
        <SummaryCard
          label="Média prioridade" count={media} sub="Acompanhar" accentColor="#fbbf24"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
        <SummaryCard
          label="Baixa prioridade" count={baixa} sub="Informativos" accentColor="#4ade80"
          icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
        />
      </div>

      {/* Filter bar */}
      <div style={{
        background:   'var(--surface2)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding:      '16px 20px',
      }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '12px' }}>

          {/* Period */}
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 600, marginBottom: '6px' }}>Período</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date" value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '12px' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <input
                type="date" value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1) }}
                style={{ padding: '7px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '12px' }}
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 600, marginBottom: '6px' }}>Prioridade</div>
            <SelectInput value={priority} onChange={v => { setPriority(v as PriorityFilter); setPage(1) }}>
              <option value="TODAS">Todas</option>
              <option value="ALTA">Alta</option>
              <option value="MÉDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </SelectInput>
          </div>

          {/* Type */}
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 600, marginBottom: '6px' }}>Tipo de alerta</div>
            <SelectInput value={typeFilter} onChange={v => { setTypeFilter(v); setPage(1) }} minWidth={170}>
              <option value="TODOS">Todos</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{TYPE_LABEL[t] ?? t}</option>)}
            </SelectInput>
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: '160px' }}>
            <div style={{ fontSize: '9px', color: 'transparent', marginBottom: '6px' }}>-</div>
            <div style={{ position: 'relative' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text" placeholder="Buscar alerta..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                style={{ width: '100%', padding: '7px 12px 7px 30px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', fontSize: '12px', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={clearFilters}
            style={{ padding: '6px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text-sec)', fontSize: '12px', cursor: 'pointer' }}
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Alert table */}
      <div style={{
        background:   'var(--surface2)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        overflow:     'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 90px 100px 100px 24px',
          gap: '12px', padding: '11px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'var(--surface2)',
        }}>
          {['Alerta', 'Prioridade', 'Data ↓', 'Status', ''].map((h, i) => (
            <span key={i} style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{h}</span>
          ))}
        </div>

        {paginated.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Nenhum alerta encontrado com os filtros aplicados.
          </div>
        ) : paginated.map((alert, i) => {
          const { date, time } = fmtDate(alert.created_at)
          const isRead = readIds.has(alert.id)
          return (
            <AlertRow
              key={alert.id}
              alert={alert}
              date={date}
              time={time}
              isRead={isRead}
              isLast={i === paginated.length - 1}
              onRead={() => markRead(alert.id)}
            />
          )
        })}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Mostrando {Math.min((safePage - 1) * pageSize + 1, filtered.length)} a {Math.min(safePage * pageSize, filtered.length)} de {filtered.length} alertas
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PageBtn disabled={safePage === 1} onClick={() => setPage(p => p - 1)}>‹</PageBtn>
            {pageButtons().map(p => (
              <PageBtn key={p} active={p === safePage} onClick={() => setPage(p)}>{p}</PageBtn>
            ))}
            <PageBtn disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>›</PageBtn>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
              style={{ marginLeft: '8px', padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '7px', color: 'var(--text)', fontSize: '12px' }}
            >
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s} por página</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AlertRow ────────────────────────────────────────────────────────────────

function AlertRow({ alert, date, time, isRead, isLast, onRead }: {
  alert: AlertEventRow; date: string; time: string
  isRead: boolean; isLast: boolean; onRead: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onRead}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:       'grid',
        gridTemplateColumns: '1fr 90px 100px 100px 24px',
        gap:           '12px',
        padding:       '14px 20px',
        borderBottom:  isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
        cursor:        'pointer',
        background:    hovered ? 'var(--text-dim)' : 'transparent',
        alignItems:    'center',
        transition:    'background 0.12s',
      }}
    >
      {/* Alert info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <AlertRowIcon severity={alert.severity} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: '13px', fontWeight: isRead ? 500 : 600,
            color: isRead ? 'var(--text)' : '#fff',
            marginBottom: '2px', lineHeight: 1.3,
          }}>
            {alert.title}
          </div>
          <div style={{
            fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {alert.message}
          </div>
        </div>
      </div>

      {/* Priority badge */}
      <div><PriorityBadge severity={alert.severity} /></div>

      {/* Date */}
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{date}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{time}</div>
      </div>

      {/* Read status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
          background: isRead ? 'var(--text-muted)' : '#f87171',
          display: 'inline-block',
        }} />
        <span style={{ fontSize: '11px', color: isRead ? 'var(--text-muted)' : 'var(--text)', fontWeight: isRead ? 400 : 500, whiteSpace: 'nowrap' }}>
          {isRead ? 'Lido' : 'Não lido'}
        </span>
      </div>

      {/* Arrow */}
      <div style={{ color: 'var(--text-muted)', fontSize: '16px', textAlign: 'right' }}>›</div>
    </div>
  )
}

// ── PageBtn ─────────────────────────────────────────────────────────────────

function PageBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:      '5px 11px',
        background:   active ? '#f59e0b' : 'transparent',
        border:       active ? 'none' : '1px solid rgba(255,255,255,0.12)',
        borderRadius: '7px',
        color:        active ? '#000' : disabled ? 'var(--text-muted)' : 'var(--text)',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        fontSize:     '13px',
        fontWeight:   active ? 700 : 400,
        minWidth:     '32px',
      }}
    >
      {children}
    </button>
  )
}
