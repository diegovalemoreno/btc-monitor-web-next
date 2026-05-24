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
    const from = new Date(today); from.setDate(from.getDate() - 29)
    return { from, to: null }
  }
  if (period === 'thisWeek') {
    const from = new Date(today); from.setDate(from.getDate() - from.getDay())
    return { from, to: null }
  }
  if (period === 'thisMonth') return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: null }
  if (period === 'lastMonth') {
    return {
      from: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      to:   new Date(today.getFullYear(), today.getMonth(), 0),
    }
  }
  if (period === 'custom') {
    return {
      from: customFrom ? new Date(customFrom + 'T00:00:00') : null,
      to:   customTo   ? new Date(customTo   + 'T00:00:00') : null,
    }
  }
  return { from: null, to: null }
}

// Extract fee from notes like "COMPRA P2P - vempradig · taxa R$46.00"
function extractFee(notes: string | null): number | null {
  if (!notes) return null
  const m = notes.match(/taxa R\$(\d+(?:[.,]\d+)?)/)
  if (!m) return null
  return parseFloat(m[1].replace(',', '.'))
}

function efficiencyLabel(diffPct: number): { label: string; color: string } {
  if (diffPct < 2)  return { label: 'Excelente', color: '#22C55E' }
  if (diffPct < 4)  return { label: 'Boa',       color: '#86EFAC' }
  if (diffPct < 6)  return { label: 'Moderada',  color: '#F59E0B' }
  if (diffPct < 10) return { label: 'Alta',       color: '#F97316' }
  return              { label: 'Muito alta',     color: '#EF4444' }
}

interface PriceEvolutionRow {
  label:  string; cumAvg: number; cumBtc: number; cumBrl: number; trend: 'up' | 'down' | 'flat' | null
}

function buildPriceEvolution(contributions: DcaContributionRow[]): PriceEvolutionRow[] {
  const withSats = contributions.filter(c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
  if (withSats.length === 0) return []
  const sorted = [...withSats].sort((a, b) => a.contribution_date.localeCompare(b.contribution_date))
  const ymSet = new Set<string>()
  for (const c of sorted) {
    const d = new Date(c.contribution_date + 'T00:00:00')
    ymSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const rows: PriceEvolutionRow[] = []
  let prevAvg: number | null = null
  for (const ym of ymSet) {
    const [y, m] = ym.split('-').map(Number)
    const endOfMonth = new Date(y, m, 0)
    const cumC   = withSats.filter(c => new Date(c.contribution_date + 'T00:00:00') <= endOfMonth)
    const cumBrl = cumC.reduce((s, c) => s + c.amount, 0)
    const cumSats = cumC.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
    const cumBtc  = cumSats / 1e8
    const cumAvg  = cumBtc > 0 ? cumBrl / cumBtc : 0
    const trend: PriceEvolutionRow['trend'] = prevAvg === null ? null : cumAvg > prevAvg + 100 ? 'up' : cumAvg < prevAvg - 100 ? 'down' : 'flat'
    const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    rows.push({ label: `${MONTHS_PT[m - 1]}/${String(y).slice(2)}`, cumAvg, cumBtc, cumBrl, trend })
    prevAvg = cumAvg
  }
  return rows.reverse()
}

interface Props { initialContributions: DcaContributionRow[] }

export default function DcaContributionHistory({ initialContributions }: Props) {
  const [contributions, setContributions] = useState<DcaContributionRow[]>(initialContributions)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [filterType, setFilterType]       = useState<ContributionType | 'ALL'>('ALL')
  const [periodFilter, setPeriodFilter]   = useState<PeriodFilter>('thisMonth')
  const [customFrom, setCustomFrom]       = useState('')
  const [customTo, setCustomTo]           = useState('')
  const [expandedId, setExpandedId]       = useState<string | null>(null)

  const { from, to } = getPeriodRange(periodFilter, customFrom, customTo)
  const periodFiltered = contributions.filter(c => {
    const d = new Date(c.contribution_date + 'T00:00:00')
    if (from && d < from) return false
    if (to   && d > to)   return false
    return true
  })

  const filtered = filterType === 'ALL'
    ? periodFiltered
    : periodFiltered.filter(c => c.contribution_type === filterType)

  const groups = filtered.reduce<Record<string, DcaContributionRow[]>>((acc, c) => {
    const d   = new Date(c.contribution_date + 'T00:00:00')
    const key = d.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
    acc[key]  = acc[key] ?? []
    acc[key].push(c)
    return acc
  }, {})
  const monthKeys = Object.keys(groups)

  // Summary stats — all contributions (not filtered)
  const totalAmount = contributions.reduce((s, c) => s + c.amount, 0)
  const totalSats   = contributions.filter(c => !c.notes?.includes('Venda')).reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
  const withSats    = contributions.filter(c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
  const avgPriceBrl = withSats.length > 0
    ? (withSats.reduce((s, c) => s + c.amount, 0) / withSats.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)) * 100_000_000
    : null

  // Fee analytics — period filtered BTC purchases with fee data
  const btcPurchasesFiltered = periodFiltered.filter(c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
  const feesKnown     = btcPurchasesFiltered.filter(c => extractFee(c.notes) !== null)
  const totalFees     = feesKnown.reduce((s, c) => s + (extractFee(c.notes) ?? 0), 0)
  const totalSpread   = btcPurchasesFiltered
    .filter(c => c.effective_price_brl && c.btc_price_brl)
    .reduce((s, c) => s + (c.effective_price_brl! - c.btc_price_brl!) * (c.sats_purchased! / 1e8), 0)
  const totalImpact   = totalFees + Math.max(0, totalSpread - totalFees)

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

      {/* Global summary bar */}
      <div style={{
        display: 'flex', gap: '24px', flexWrap: 'wrap',
        padding: '16px 24px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '24px',
      }}>
        <SummaryItem label="Total de aportes" value={String(contributions.length)} />
        <SummaryItem label="Volume total" value={fmt(totalAmount)} color="var(--orange)" />
        {totalSats > 0 && <SummaryItem label="Total BTC" value={fmtBTC(totalSats)} color="#F7931A" />}
        {avgPriceBrl !== null && (
          <SummaryItem
            label="Preço médio acumulado"
            value={fmtBRL0(avgPriceBrl) + '/BTC'}
            color="#22C55E"
            hint={`Total R$ ÷ total BTC (${withSats.length} aportes)`}
          />
        )}
      </div>

      {/* Chart */}
      <DcaPatrimonyChart contributions={periodFiltered} />

      {/* Fee analytics panel */}
      {feesKnown.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', marginBottom: '24px', overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 20px', borderBottom: '1px solid var(--border-dim)',
            fontSize: '11px', fontWeight: 600, color: 'var(--text-sec)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Análise de custos · {periodFilter === 'all' ? 'histórico completo' : PERIOD_LABELS[periodFilter]}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0' }}>
            <FeeMetric label="Taxas pagas"           value={fmt(totalFees)}    color="#F59E0B" hint="Taxa explícita cobrada pela plataforma" />
            <FeeMetric label="Spread acumulado"      value={fmt(Math.max(0, totalSpread - totalFees))} color="#F97316" hint="Diferença entre cotação e preço efetivo" />
            <FeeMetric label="Impacto total"         value={fmt(totalImpact)}  color="#EF4444" hint="Custo total acima do preço de mercado" />
            <FeeMetric label="Aportes analisados"    value={`${feesKnown.length}`} hint="Com dados de taxa da vempradig" />
          </div>
        </div>
      )}

      {/* Price evolution */}
      {priceEvolution.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '12px', marginBottom: '24px', overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border-dim)',
            fontSize: '11px', fontWeight: 600, color: 'var(--text-sec)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            Evolução do preço médio
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  {(['Mês', 'Preço médio acumulado', 'BTC acumulado', 'Total investido'] as const).map(h => (
                    <th key={h} style={{
                      padding: '8px 20px', fontSize: '10px', color: 'var(--text-muted)',
                      fontWeight: 500, textAlign: h === 'Mês' ? 'left' : 'right',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceEvolution.map((row, idx) => (
                  <tr key={row.label} style={{ borderTop: idx > 0 ? '1px solid var(--border-dim)' : 'none' }}>
                    <td style={{ padding: '10px 20px', fontSize: '13px', color: 'var(--text)', fontWeight: 500, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                      {row.label}
                    </td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 700, color: '#22C55E', whiteSpace: 'nowrap' }}>
                      {fmtK(row.cumAvg)}/BTC
                      {row.trend && (
                        <span style={{ marginLeft: '6px', fontSize: '11px', color: row.trend === 'up' ? '#EF4444' : row.trend === 'down' ? '#22C55E' : 'var(--text-muted)' }}>
                          {row.trend === 'up' ? '↑' : row.trend === 'down' ? '↓' : '—'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', fontFamily: "'Courier New', monospace", fontSize: '12px', color: '#F7931A', whiteSpace: 'nowrap' }}>
                      {fmtBTC(Math.round(row.cumBtc * 1e8))}
                    </td>
                    <td style={{ padding: '10px 20px', textAlign: 'right', fontFamily: "'Courier New', monospace", fontSize: '12px', color: 'var(--text-sec)', whiteSpace: 'nowrap' }}>
                      {fmt(row.cumBrl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Period filter */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map(p => (
            <button key={p} onClick={() => setPeriodFilter(p)} style={{
              padding: '5px 12px',
              background: periodFilter === p ? 'rgba(99,102,241,0.15)' : 'var(--surface)',
              border: `1px solid ${periodFilter === p ? '#6366F1' : 'var(--border)'}`,
              borderRadius: '20px',
              color: periodFilter === p ? '#6366F1' : 'var(--text-muted)',
              fontSize: '12px', fontWeight: periodFilter === p ? 600 : 400, cursor: 'pointer',
            }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        {periodFilter === 'custom' && (
          <div style={{ display: 'flex', gap: '12px', marginTop: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {(['De', 'Até'] as const).map((lbl, i) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lbl}</label>
                <input type="date" value={i === 0 ? customFrom : customTo}
                  onChange={e => i === 0 ? setCustomFrom(e.target.value) : setCustomTo(e.target.value)}
                  style={{ padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Type filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['ALL', 'TACTICAL', 'STRUCTURAL_DCA', 'MANUAL'] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t)} style={{
            padding: '5px 12px',
            background: filterType === t ? 'var(--orange-dim)' : 'var(--surface)',
            border: `1px solid ${filterType === t ? 'var(--orange)' : 'var(--border)'}`,
            borderRadius: '20px', color: filterType === t ? 'var(--orange)' : 'var(--text-muted)',
            fontSize: '12px', fontWeight: filterType === t ? 600 : 400, cursor: 'pointer',
          }}>
            {t === 'ALL' ? 'Todos' : TYPE_META[t as ContributionType].label}
          </button>
        ))}
      </div>

      {/* No results */}
      {monthKeys.length === 0 && (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          Nenhum aporte encontrado{periodFilter !== 'all' ? ' no período selecionado' : ''}.
        </div>
      )}

      {/* Grouped list */}
      {monthKeys.map(monthKey => {
        const items      = groups[monthKey]
        const monthTotal = items.filter(c => !c.notes?.includes('Venda')).reduce((s, c) => s + c.amount, 0)
        return (
          <div key={monthKey} style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sec)', textTransform: 'capitalize' }}>
                {monthKey}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Courier New', monospace" }}>
                {fmt(monthTotal)}
              </span>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              {items.map((c, idx) => {
                const typeMeta = TYPE_META[c.contribution_type]
                const d        = new Date(c.contribution_date + 'T00:00:00')
                const dateStr  = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                const isExpanded = expandedId === c.id
                const isVenda  = c.notes?.includes('Venda') || false

                // Fee analysis data
                const fee = extractFee(c.notes)
                const hasPriceData = c.effective_price_brl && c.btc_price_brl
                const diffPct = hasPriceData
                  ? ((c.effective_price_brl! - c.btc_price_brl!) / c.btc_price_brl!) * 100
                  : null
                const efficiency = diffPct !== null ? efficiencyLabel(diffPct) : null

                return (
                  <div key={c.id} style={{ borderTop: idx > 0 ? '1px solid var(--border-dim)' : 'none' }}>
                    {/* Main row */}
                    <div
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '16px',
                        padding: '14px 20px',
                        cursor: hasPriceData ? 'pointer' : 'default',
                        background: isExpanded ? 'rgba(99,102,241,0.04)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onClick={() => hasPriceData && setExpandedId(isExpanded ? null : c.id)}
                    >
                      {/* Date */}
                      <div style={{ minWidth: '120px', flexShrink: 0 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{dateStr}</div>
                      </div>

                      {/* Notes + context */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {c.notes && (
                          <div style={{ fontSize: '12px', color: 'var(--text-sec)', marginBottom: '2px', wordBreak: 'break-word' }}>
                            {c.notes.split(' · taxa')[0]}
                          </div>
                        )}
                        {c.market_state_snapshot && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Score {c.market_score_snapshot ?? '—'} · {STATE_LABEL[c.market_state_snapshot] ?? c.market_state_snapshot}
                          </div>
                        )}
                        {!c.notes && !c.market_state_snapshot && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>—</div>
                        )}
                      </div>

                      {/* BTC + prices */}
                      <div style={{ minWidth: '140px', flexShrink: 0, textAlign: 'right' }}>
                        {c.sats_purchased && !isVenda
                          ? <div style={{ fontSize: '12px', color: '#F7931A', fontWeight: 600, fontFamily: "'Courier New', monospace", marginBottom: '3px' }}>
                              {fmtBTC(c.sats_purchased)}
                            </div>
                          : <div style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.3, marginBottom: '3px' }}>—</div>
                        }
                        {c.effective_price_brl && (
                          <div style={{ fontSize: '10px', color: 'var(--text-sec)', fontFamily: "'Courier New', monospace" }}>
                            <span style={{ fontFamily: 'sans-serif', color: 'var(--text-muted)' }}>efetivo </span>
                            {fmtBRL0(c.effective_price_brl)}/BTC
                          </div>
                        )}
                      </div>

                      {/* Type badge */}
                      <span style={{
                        padding: '2px 8px', background: `${typeMeta.color}20`, color: typeMeta.color,
                        borderRadius: '12px', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {typeMeta.label}
                      </span>

                      {/* Amount */}
                      <span style={{
                        fontSize: '14px', fontWeight: 700,
                        color: isVenda ? '#22C55E' : 'var(--text)',
                        fontFamily: "'Courier New', monospace", textAlign: 'right', whiteSpace: 'nowrap',
                      }}>
                        {isVenda ? '+' : ''}{fmt(c.amount)}
                      </span>

                      {/* Expand indicator */}
                      {hasPriceData && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      )}

                      {/* Delete */}
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
                        disabled={deletingId === c.id}
                        title="Remover aporte"
                        style={{
                          background: 'none', border: 'none',
                          color: deletingId === c.id ? 'var(--text-muted)' : 'rgba(239,68,68,0.5)',
                          cursor: deletingId === c.id ? 'not-allowed' : 'pointer',
                          fontSize: '16px', padding: '0 4px', borderRadius: '4px', lineHeight: 1,
                        }}
                      >
                        {deletingId === c.id ? '…' : '×'}
                      </button>
                    </div>

                    {/* Expanded fee breakdown */}
                    {isExpanded && hasPriceData && (
                      <div style={{
                        padding: '12px 20px 16px 140px',
                        background: 'rgba(99,102,241,0.04)',
                        borderTop: '1px solid var(--border-dim)',
                      }}>
                        <table style={{ fontSize: '11px', borderCollapse: 'collapse', width: '100%', maxWidth: '400px' }}>
                          <tbody>
                            <FeeRow label="Cotação BTC"        value={fmtBRL0(c.btc_price_brl!)} />
                            <FeeRow label="Seu preço efetivo"  value={fmtBRL0(c.effective_price_brl!)} valueColor="#F59E0B" />
                            {diffPct !== null && (
                              <FeeRow
                                label="Diferença"
                                value={`+${diffPct.toFixed(2).replace('.', ',')}%`}
                                valueColor={diffPct > 8 ? '#EF4444' : diffPct > 4 ? '#F59E0B' : '#22C55E'}
                              />
                            )}
                            {fee !== null && <FeeRow label="Taxa paga" value={fmt(fee)} valueColor="#F97316" />}
                            {efficiency && (
                              <FeeRow label="Eficiência" value={efficiency.label} valueColor={efficiency.color} />
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
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

function FeeRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <tr>
      <td style={{ padding: '3px 16px 3px 0', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</td>
      <td style={{ padding: '3px 0', color: valueColor ?? 'var(--text)', fontWeight: 600, fontFamily: "'Courier New', monospace" }}>{value}</td>
    </tr>
  )
}

function FeeMetric({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div style={{ padding: '14px 20px', flex: '1 1 140px', borderRight: '1px solid var(--border-dim)' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
      {hint && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>{hint}</div>}
    </div>
  )
}

function SummaryItem({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
      {hint && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{hint}</div>}
    </div>
  )
}
