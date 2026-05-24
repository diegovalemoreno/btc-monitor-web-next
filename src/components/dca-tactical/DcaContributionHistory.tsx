'use client'

import { useState } from 'react'
import type { DcaContributionRow, ContributionType } from '@/lib/db/types'
import DcaPatrimonyChart from './DcaPatrimonyChart'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const fmtBTC = (sats: number) => {
  const btc = sats / 1e8
  const str = btc.toFixed(8).replace(/\.?0+$/, '')
  return str + ' BTC'
}

const fmtBRL0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const fmtK = (n: number) => {
  if (n >= 1_000_000) return 'R$ ' + (n / 1_000_000).toFixed(2).replace('.', ',') + 'M'
  if (n >= 1_000)     return 'R$ ' + Math.round(n / 1_000) + 'k'
  return fmtBRL0(n)
}

const TYPE_META: Record<ContributionType, { label: string; color: string }> = {
  TACTICAL:       { label: 'Tático',        color: '#00BCD4' },
  STRUCTURAL_DCA: { label: 'DCA Estrutural', color: 'var(--orange)' },
  MANUAL:         { label: 'Manual',         color: 'var(--text-muted)' },
}

const STATE_LABEL: Record<string, string> = {
  DEFENSIVE:  'Defensivo',
  NEUTRAL:    'Neutro',
  FAVORABLE:  'Favorável',
  AGGRESSIVE: 'Agressivo',
}

type PeriodFilter = 'all' | 'last30' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'custom'

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all:       'Todos',
  last30:    'Últimos 30 dias',
  thisWeek:  'Esta semana',
  thisMonth: 'Este mês',
  lastMonth: 'Mês anterior',
  custom:    'Personalizado',
}

function getPeriodRange(period: PeriodFilter, customFrom: string, customTo: string): { from: Date | null; to: Date | null } {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (period === 'last30') {
    const from = new Date(today)
    from.setDate(from.getDate() - 29)
    return { from, to: null }
  }
  if (period === 'thisWeek') {
    const from = new Date(today)
    from.setDate(from.getDate() - from.getDay())
    return { from, to: null }
  }
  if (period === 'thisMonth') {
    return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: null }
  }
  if (period === 'lastMonth') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const to   = new Date(today.getFullYear(), today.getMonth(), 0)
    return { from, to }
  }
  if (period === 'custom') {
    const from = customFrom ? new Date(customFrom + 'T00:00:00') : null
    const to   = customTo   ? new Date(customTo   + 'T00:00:00') : null
    return { from, to }
  }
  return { from: null, to: null }
}

interface PriceEvolutionRow {
  label:    string
  cumAvg:   number
  cumBtc:   number
  cumBrl:   number
  trend:    'up' | 'down' | 'flat' | null
}

function buildPriceEvolution(contributions: DcaContributionRow[]): PriceEvolutionRow[] {
  const withSats = contributions.filter(c => c.sats_purchased && c.sats_purchased > 0)
  if (withSats.length === 0) return []

  // Sort ascending
  const sorted = [...withSats].sort((a, b) =>
    a.contribution_date.localeCompare(b.contribution_date)
  )

  // Collect unique year-months in order
  const ymSet = new Set<string>()
  for (const c of sorted) {
    const d = new Date(c.contribution_date + 'T00:00:00')
    ymSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const rows: PriceEvolutionRow[] = []
  let prevAvg: number | null = null

  for (const ym of ymSet) {
    const [y, m] = ym.split('-').map(Number)
    const endOfMonth = new Date(y, m, 0) // last day of month

    const cumContribs = withSats.filter(c => {
      const d = new Date(c.contribution_date + 'T00:00:00')
      return d <= endOfMonth
    })

    const cumBrl = cumContribs.reduce((s, c) => s + c.amount, 0)
    const cumSats = cumContribs.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
    const cumBtc  = cumSats / 1e8
    const cumAvg  = cumBtc > 0 ? cumBrl / cumBtc : 0

    const trend: PriceEvolutionRow['trend'] =
      prevAvg === null ? null :
      cumAvg > prevAvg + 100 ? 'up' :
      cumAvg < prevAvg - 100 ? 'down' : 'flat'

    const label = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

    rows.push({ label, cumAvg, cumBtc, cumBrl, trend })
    prevAvg = cumAvg
  }

  // Most recent first
  return rows.reverse()
}

interface Props {
  initialContributions: DcaContributionRow[]
}

export default function DcaContributionHistory({ initialContributions }: Props) {
  const [contributions, setContributions] = useState<DcaContributionRow[]>(initialContributions)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [filterType, setFilterType]       = useState<ContributionType | 'ALL'>('ALL')
  const [periodFilter, setPeriodFilter]   = useState<PeriodFilter>('thisMonth')
  const [customFrom, setCustomFrom]       = useState('')
  const [customTo, setCustomTo]           = useState('')

  // Period filtering
  const { from, to } = getPeriodRange(periodFilter, customFrom, customTo)
  const periodFiltered = contributions.filter(c => {
    const d = new Date(c.contribution_date + 'T00:00:00')
    if (from && d < from) return false
    if (to   && d > to)   return false
    return true
  })

  // Type filtering (applied on top of period)
  const filtered = filterType === 'ALL'
    ? periodFiltered
    : periodFiltered.filter(c => c.contribution_type === filterType)

  // Group by year-month
  const groups = filtered.reduce<Record<string, DcaContributionRow[]>>((acc, c) => {
    const d   = new Date(c.contribution_date + 'T00:00:00')
    const key = d.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
    acc[key]  = acc[key] ?? []
    acc[key].push(c)
    return acc
  }, {})

  const monthKeys = Object.keys(groups)

  // Summary stats — always over ALL contributions (not filtered)
  const totalAmount = contributions.reduce((s, c) => s + c.amount, 0)
  const totalSats   = contributions.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
  const withSats    = contributions.filter(c => c.sats_purchased && c.sats_purchased > 0)
  const avgPriceBrl = withSats.length > 0
    ? (withSats.reduce((s, c) => s + c.amount, 0) / withSats.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)) * 100_000_000
    : null

  // Price evolution — all contributions, not period filtered
  const priceEvolution = buildPriceEvolution(contributions)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/dca/contributions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha')
      setContributions(prev => prev.filter(c => c.id !== id))
    } catch {
      alert('Erro ao remover aporte. Tente novamente.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>

      {/* Summary bar */}
      <div style={{
        display:      'flex',
        gap:          '24px',
        flexWrap:     'wrap',
        padding:      '16px 24px',
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: '12px',
        marginBottom: '24px',
      }}>
        <SummaryItem label="Total de aportes" value={String(contributions.length)} />
        <SummaryItem label="Volume total" value={fmt(totalAmount)} color="var(--orange)" />
        {totalSats > 0 && (
          <SummaryItem label="Total acumulado" value={fmtBTC(totalSats)} color="#F7931A" />
        )}
        {avgPriceBrl !== null && (
          <SummaryItem
            label="Preço médio acumulado"
            value={fmtBRL0(avgPriceBrl) + '/BTC'}
            color="#22C55E"
            hint={`Quanto você pagou por BTC em média — total R$ ÷ total BTC (${withSats.length} aporte${withSats.length !== 1 ? 's' : ''})`}
          />
        )}
        <SummaryItem
          label="Táticos"
          value={String(contributions.filter(c => c.contribution_type === 'TACTICAL').length)}
          color="#00BCD4"
        />
      </div>

      {/* Patrimony evolution chart — follows period filter */}
      <DcaPatrimonyChart contributions={periodFiltered} />

      {/* Price evolution section */}
      {priceEvolution.length > 0 && (
        <div style={{
          background:   'var(--surface)',
          border:       '1px solid var(--border)',
          borderRadius: '12px',
          marginBottom: '24px',
          overflow:     'hidden',
        }}>
          <div style={{
            padding:      '14px 20px',
            borderBottom: '1px solid var(--border-dim)',
            fontSize:     '11px',
            fontWeight:   600,
            color:        'var(--text-sec)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Evolução do preço médio
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  {(['Mês', 'Preço médio acumulado', 'BTC acumulado', 'Total investido'] as const).map(h => (
                    <th key={h} style={{
                      padding:   '8px 20px',
                      fontSize:  '10px',
                      color:     'var(--text-muted)',
                      fontWeight: 500,
                      textAlign: h === 'Mês' ? 'left' : 'right',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceEvolution.map((row, idx) => (
                  <tr
                    key={row.label}
                    style={{ borderTop: idx > 0 ? '1px solid var(--border-dim)' : 'none' }}
                  >
                    <td style={{
                      padding:   '10px 20px',
                      fontSize:  '13px',
                      color:     'var(--text)',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      whiteSpace: 'nowrap',
                    }}>
                      {row.label}
                    </td>
                    <td style={{
                      padding:    '10px 20px',
                      textAlign:  'right',
                      fontFamily: "'Courier New', monospace",
                      fontSize:   '13px',
                      fontWeight: 700,
                      color:      '#22C55E',
                      whiteSpace: 'nowrap',
                    }}>
                      {fmtK(row.cumAvg)}/BTC
                      {row.trend && (
                        <span style={{
                          marginLeft: '6px',
                          fontSize:   '11px',
                          color: row.trend === 'up' ? '#EF4444' : row.trend === 'down' ? '#22C55E' : 'var(--text-muted)',
                        }}>
                          {row.trend === 'up' ? '↑' : row.trend === 'down' ? '↓' : '—'}
                        </span>
                      )}
                    </td>
                    <td style={{
                      padding:    '10px 20px',
                      textAlign:  'right',
                      fontFamily: "'Courier New', monospace",
                      fontSize:   '12px',
                      color:      '#F7931A',
                      whiteSpace: 'nowrap',
                    }}>
                      {fmtBTC(Math.round(row.cumBtc * 1e8))}
                    </td>
                    <td style={{
                      padding:    '10px 20px',
                      textAlign:  'right',
                      fontFamily: "'Courier New', monospace",
                      fontSize:   '12px',
                      color:      'var(--text-sec)',
                      whiteSpace: 'nowrap',
                    }}>
                      {fmt(row.cumBrl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '8px 20px', fontSize: '10px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-dim)' }}>
            Valores acumulados até o final de cada mês. Seta vermelha (↑) = preço médio subiu; verde (↓) = caiu.
          </div>
        </div>
      )}

      {/* Period filter */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              style={{
                padding:      '5px 12px',
                background:   periodFilter === p ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
                border:       `1px solid ${periodFilter === p ? '#6366F1' : 'var(--border)'}`,
                borderRadius: '20px',
                color:        periodFilter === p ? '#6366F1' : 'var(--text-muted)',
                fontSize:     '12px',
                fontWeight:   periodFilter === p ? 600 : 400,
                cursor:       'pointer',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {periodFilter === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>De</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                style={{
                  padding:      '4px 8px',
                  background:   'var(--surface)',
                  border:       '1px solid var(--border)',
                  borderRadius: '6px',
                  color:        'var(--text)',
                  fontSize:     '12px',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Até</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                style={{
                  padding:      '4px 8px',
                  background:   'var(--surface)',
                  border:       '1px solid var(--border)',
                  borderRadius: '6px',
                  color:        'var(--text)',
                  fontSize:     '12px',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['ALL', 'TACTICAL', 'STRUCTURAL_DCA', 'MANUAL'] as const).map(t => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            style={{
              padding:      '5px 12px',
              background:   filterType === t ? 'var(--orange-dim)' : 'var(--surface)',
              border:       `1px solid ${filterType === t ? 'var(--orange)' : 'var(--border)'}`,
              borderRadius: '20px',
              color:        filterType === t ? 'var(--orange)' : 'var(--text-muted)',
              fontSize:     '12px',
              fontWeight:   filterType === t ? 600 : 400,
              cursor:       'pointer',
            }}
          >
            {t === 'ALL' ? 'Todos' : TYPE_META[t as ContributionType].label}
          </button>
        ))}
      </div>

      {/* No results */}
      {monthKeys.length === 0 && (
        <div style={{
          padding:      '40px 24px',
          textAlign:    'center',
          color:        'var(--text-muted)',
          fontSize:     '14px',
          background:   'var(--surface)',
          border:       '1px solid var(--border)',
          borderRadius: '12px',
        }}>
          Nenhum aporte encontrado{periodFilter !== 'all' ? ' no período selecionado' : ''}.
        </div>
      )}

      {/* Grouped list */}
      {monthKeys.map(monthKey => {
        const items      = groups[monthKey]
        const monthTotal = items.reduce((s, c) => s + c.amount, 0)
        return (
          <div key={monthKey} style={{ marginBottom: '28px' }}>
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              marginBottom:   '10px',
              padding:        '0 4px',
            }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sec)', textTransform: 'capitalize' }}>
                {monthKey}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Courier New', monospace" }}>
                {fmt(monthTotal)}
              </span>
            </div>

            <div style={{
              background:   'var(--surface)',
              border:       '1px solid var(--border)',
              borderRadius: '12px',
              overflow:     'hidden',
            }}>
              {items.map((c, idx) => {
                const typeMeta = TYPE_META[c.contribution_type]
                const d        = new Date(c.contribution_date + 'T00:00:00')
                const dateStr  = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

                return (
                  <div
                    key={c.id}
                    style={{
                      display:    'flex',
                      alignItems: 'flex-start',
                      gap:        '16px',
                      padding:    '14px 20px',
                      borderTop:  idx > 0 ? '1px solid var(--border-dim)' : 'none',
                    }}
                  >
                    {/* Date */}
                    <div style={{ minWidth: '120px', flexShrink: 0 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>
                        {dateStr}
                      </div>
                    </div>

                    {/* Notes + context */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {c.notes && (
                        <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '3px', wordBreak: 'break-word' }}>
                          {c.notes}
                        </div>
                      )}
                      {c.market_state_snapshot && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: c.notes ? 0 : '2px' }}>
                          Score {c.market_score_snapshot ?? '—'} · {STATE_LABEL[c.market_state_snapshot] ?? c.market_state_snapshot}
                        </div>
                      )}
                      {!c.notes && !c.market_state_snapshot && (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>—</div>
                      )}
                    </div>

                    {/* BTC + prices */}
                    <div style={{ minWidth: '150px', flexShrink: 0, textAlign: 'right' }}>
                      {c.sats_purchased
                        ? <div style={{ fontSize: '12px', color: '#F7931A', fontWeight: 600, fontFamily: "'Courier New', monospace", marginBottom: '4px' }}>
                            {fmtBTC(c.sats_purchased)}
                          </div>
                        : <div style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.3, marginBottom: '4px' }}>—</div>
                      }
                      {c.effective_price_brl && (
                        <div style={{ fontSize: '11px', color: 'var(--text-sec)', fontFamily: "'Courier New', monospace" }}>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'sans-serif', fontSize: '10px' }}>efetivo </span>
                          {fmtBRL0(c.effective_price_brl)}/BTC
                        </div>
                      )}
                      {c.btc_price_brl && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Courier New', monospace" }}>
                          <span style={{ fontFamily: 'sans-serif', fontSize: '10px' }}>cotação </span>
                          {fmtBRL0(c.btc_price_brl)}/BTC
                        </div>
                      )}
                    </div>

                    {/* Type badge */}
                    <span style={{
                      padding:      '2px 8px',
                      background:   `${typeMeta.color}20`,
                      color:        typeMeta.color,
                      borderRadius: '12px',
                      fontSize:     '10px',
                      fontWeight:   600,
                      whiteSpace:   'nowrap',
                    }}>
                      {typeMeta.label}
                    </span>

                    {/* Amount */}
                    <span style={{
                      fontSize:   '14px',
                      fontWeight: 700,
                      color:      'var(--text)',
                      fontFamily: "'Courier New', monospace",
                      textAlign:  'right',
                      whiteSpace: 'nowrap',
                    }}>
                      {fmt(c.amount)}
                    </span>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      title="Remover aporte"
                      style={{
                        background:   'none',
                        border:       'none',
                        color:        deletingId === c.id ? 'var(--text-muted)' : 'rgba(239,68,68,0.5)',
                        cursor:       deletingId === c.id ? 'not-allowed' : 'pointer',
                        fontSize:     '16px',
                        padding:      '0 4px',
                        borderRadius: '4px',
                        lineHeight:   1,
                      }}
                    >
                      {deletingId === c.id ? '…' : '×'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SummaryItem({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{hint}</div>
      )}
    </div>
  )
}
