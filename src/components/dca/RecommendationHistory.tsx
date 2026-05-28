'use client'

import React, { useState, useMemo } from 'react'
import type { DcaRecommendationRow, DcaAction } from '@/lib/db/types'

const PAGE_SIZE = 10

function toISODate(d: Date) { return d.toISOString().slice(0, 10) }

const ACTION_LABEL: Record<DcaAction, string> = {
  WAIT:           'Aguardar',
  REDUCED_DCA:    'DCA Reduzido',
  NORMAL_DCA:     'DCA Normal',
  REINFORCED_DCA: 'DCA Reforçado',
  AGGRESSIVE_DCA: 'DCA Agressivo',
}

const ACTION_COLOR: Record<DcaAction, string> = {
  WAIT:           '#f87171',
  REDUCED_DCA:    '#fb923c',
  NORMAL_DCA:     '#fbbf24',
  REINFORCED_DCA: '#86efac',
  AGGRESSIVE_DCA: '#4ade80',
}

const fmt0 = (n: number | null) =>
  n === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit',
    year: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function getConviction(rec: DcaRecommendationRow): number {
  const v = rec.context?.convictionScore
  if (typeof v === 'number') return v
  return rec.confidence === 'HIGH' ? 80 : rec.confidence === 'MEDIUM' ? 55 : 25
}

function MiniBar({ score }: { score: number }) {
  const color = score >= 70 ? '#4ade80' : score >= 40 ? '#fbbf24' : '#f87171'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <div style={{ width: '50px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontSize: '11px', color, fontWeight: 700, flexShrink: 0 }}>{score}</span>
    </div>
  )
}

function PgBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding:      '5px 10px',
        background:   active ? '#f59e0b' : 'transparent',
        border:       active ? 'none' : '1px solid rgba(255,255,255,0.12)',
        borderRadius: '7px',
        color:        active ? '#000' : disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        fontSize:     '12px',
        fontWeight:   active ? 700 : 400,
        minWidth:     '30px',
      }}
    >
      {children}
    </button>
  )
}

interface Props { recs: DcaRecommendationRow[] }

export default function RecommendationHistory({ recs }: Props) {
  const today    = new Date()
  const thirtyAgo = new Date(today.getTime() - 30 * 86_400_000)

  const [dateFrom,     setDateFrom]     = useState(toISODate(thirtyAgo))
  const [dateTo,       setDateTo]       = useState(toISODate(today))
  const [actionFilter, setActionFilter] = useState('TODOS')
  const [page,         setPage]         = useState(1)

  const filtered = useMemo(() => recs.filter(r => {
    const dt = new Date(r.created_at)
    if (dateFrom && dt < new Date(dateFrom + 'T00:00:00')) return false
    if (dateTo   && dt > new Date(dateTo   + 'T23:59:59')) return false
    if (actionFilter !== 'TODOS' && r.action !== actionFilter) return false
    return true
  }), [recs, dateFrom, dateTo, actionFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  function clearFilters() {
    setDateFrom(toISODate(thirtyAgo))
    setDateTo(toISODate(today))
    setActionFilter('TODOS')
    setPage(1)
  }

  function pageButtons() {
    const count = Math.min(5, totalPages)
    let start = Math.max(1, safePage - 2)
    if (start + count - 1 > totalPages) start = Math.max(1, totalPages - count + 1)
    return Array.from({ length: count }, (_, i) => start + i)
  }

  if (recs.length === 0) return (
    <div style={{ padding: '40px 24px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
      <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
        Nenhuma recomendação ainda. Configure seu plano para receber análises diárias.
      </p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Section title */}
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>Histórico de recomendações</div>

      {/* Filters */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>

          <div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '6px' }}>Período</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', color: '#fff', fontSize: '12px', colorScheme: 'dark' }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>→</span>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }}
                style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', color: '#fff', fontSize: '12px', colorScheme: 'dark' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '6px' }}>Ação</div>
            <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}
              style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', color: '#fff', fontSize: '12px', minWidth: '150px' }}>
              <option value="TODOS">Todas</option>
              {(Object.keys(ACTION_LABEL) as DcaAction[]).map(a => (
                <option key={a} value={a}>{ACTION_LABEL[a]}</option>
              ))}
            </select>
          </div>

          <button onClick={clearFilters}
            style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer' }}>
            Limpar
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '110px 150px 1fr 120px 90px 80px',
          gap: '12px', padding: '10px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
        }}>
          {['Data', 'Ação', 'Recomendação', 'Convicção', 'Aporte', 'Reserva'].map(h => (
            <span key={h} style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>{h}</span>
          ))}
        </div>

        {paginated.length === 0 ? (
          <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
            Nenhuma recomendação no período selecionado.
          </div>
        ) : paginated.map((rec, i) => {
          const action    = rec.action as DcaAction
          const color     = ACTION_COLOR[action] ?? '#fff'
          const conviction = getConviction(rec)
          const isLast    = i === paginated.length - 1
          const rationale = rec.rationale?.slice(0, 80) + (rec.rationale?.length > 80 ? '…' : '')
          return (
            <div key={rec.id} style={{
              display: 'grid', gridTemplateColumns: '110px 150px 1fr 120px 90px 80px',
              gap: '12px', padding: '12px 18px',
              borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>{fmtDate(rec.created_at)}</span>
              <div>
                <span style={{
                  fontSize: '11px', fontWeight: 700, color,
                  background: `${color}14`, border: `1px solid ${color}28`,
                  borderRadius: '4px', padding: '2px 8px', whiteSpace: 'nowrap',
                }}>
                  {ACTION_LABEL[action] ?? action}
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                {rationale}
              </span>
              <MiniBar score={conviction} />
              <span style={{ fontSize: '12px', color: '#fff', fontWeight: 500 }}>{fmt0(rec.recommended_amount_brl)}</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>{fmt0(rec.reserve_amount_brl)}</span>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            {Math.min((safePage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: '5px' }}>
            <PgBtn disabled={safePage === 1}         onClick={() => setPage(p => p - 1)}>‹</PgBtn>
            {pageButtons().map(p => <PgBtn key={p} active={p === safePage} onClick={() => setPage(p)}>{p}</PgBtn>)}
            <PgBtn disabled={safePage === totalPages} onClick={() => setPage(p => p + 1)}>›</PgBtn>
          </div>
        </div>
      )}
    </div>
  )
}
