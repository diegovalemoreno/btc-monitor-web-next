'use client'

import { useState } from 'react'
import type { DcaContributionRow, ContributionType } from '@/lib/db/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

const TYPE_META: Record<ContributionType, { label: string; color: string }> = {
  TACTICAL:       { label: 'Tático',          color: '#00BCD4' },
  STRUCTURAL_DCA: { label: 'DCA Estrutural',   color: 'var(--orange)' },
  MANUAL:         { label: 'Manual',           color: 'var(--text-muted)' },
}

const STATE_LABEL: Record<string, string> = {
  DEFENSIVE:  'Defensivo',
  NEUTRAL:    'Neutro',
  FAVORABLE:  'Favorável',
  AGGRESSIVE: 'Agressivo',
}

interface Props {
  initialContributions: DcaContributionRow[]
}

export default function DcaContributionHistory({ initialContributions }: Props) {
  const [contributions, setContributions] = useState<DcaContributionRow[]>(initialContributions)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [filterType, setFilterType]       = useState<ContributionType | 'ALL'>('ALL')

  const filtered = filterType === 'ALL'
    ? contributions
    : contributions.filter(c => c.contribution_type === filterType)

  // Group by year-month
  const groups = filtered.reduce<Record<string, DcaContributionRow[]>>((acc, c) => {
    const d     = new Date(c.contribution_date + 'T00:00:00')
    const key   = d.toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
    acc[key]    = acc[key] ?? []
    acc[key].push(c)
    return acc
  }, {})

  const monthKeys = Object.keys(groups)

  const totalAmount = contributions.reduce((s, c) => s + c.amount, 0)

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
        <SummaryItem
          label="Táticos"
          value={String(contributions.filter(c => c.contribution_type === 'TACTICAL').length)}
          color="#00BCD4"
        />
      </div>

      {/* Filter */}
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
          Nenhum aporte encontrado.
        </div>
      )}

      {/* Grouped list */}
      {monthKeys.map(monthKey => {
        const items      = groups[monthKey]
        const monthTotal = items.reduce((s, c) => s + c.amount, 0)
        return (
          <div key={monthKey} style={{ marginBottom: '28px' }}>
            {/* Month header */}
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

            {/* Rows */}
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
                      display:   'flex',
                      alignItems: 'flex-start',
                      gap:       '16px',
                      padding:   '14px 20px',
                      borderTop: idx > 0 ? '1px solid var(--border-dim)' : 'none',
                    }}
                  >
                    {/* Date */}
                    <div style={{ minWidth: '120px', flexShrink: 0 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>
                        {dateStr}
                      </div>
                    </div>

                    {/* Notes + context — grows to fill */}
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

                    {/* Type badge */}
                    <span style={{
                      padding:    '2px 8px',
                      background: `${typeMeta.color}20`,
                      color:      typeMeta.color,
                      borderRadius: '12px',
                      fontSize:   '10px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
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

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>
        {value}
      </div>
    </div>
  )
}
