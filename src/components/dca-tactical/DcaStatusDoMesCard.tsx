'use client'

import { useState } from 'react'
import type { DcaContributionRow } from '@/lib/db/types'
import { EditContributionModal } from './DcaContributionHistory'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

type MonthStatus = 'not_started' | 'partial' | 'completed' | 'exceeded'

function getMonthStatus(used: number, pool: number): MonthStatus {
  if (used <= 0)             return 'not_started'
  if (used > pool)           return 'exceeded'
  if (used >= pool * 0.99)   return 'completed'
  return 'partial'
}

const STATUS_META: Record<MonthStatus, { label: string; color: string; bg: string; border: string }> = {
  not_started: { label: 'Não iniciado', color: 'var(--text-muted)', bg: 'var(--text-dim)', border: 'var(--text-dim)' },
  partial:     { label: 'Em andamento', color: '#f59e0b',                bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
  completed:   { label: 'Concluído',    color: '#4ade80',                bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.2)'  },
  exceeded:    { label: 'Excedido',     color: '#f87171',                bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
}

interface Props {
  tacticalPool:  number
  contributions: DcaContributionRow[]
  usedThisMonth: number
  onUpdate?:     (updated: DcaContributionRow) => void
}

export default function DcaStatusDoMesCard({ tacticalPool, contributions, usedThisMonth, onUpdate }: Props) {
  const [editingContribution, setEditingContribution] = useState<DcaContributionRow | null>(null)

  const status     = getMonthStatus(usedThisMonth, tacticalPool)
  const meta       = STATUS_META[status]
  const pctUsed    = tacticalPool > 0 ? Math.min(100, (usedThisMonth / tacticalPool) * 100) : 0
  const excedido   = Math.max(0, usedThisMonth - tacticalPool)
  const disponivel = Math.max(0, tacticalPool - usedThisMonth)

  function handleSaveEdit(updated: DcaContributionRow) {
    setEditingContribution(null)
    onUpdate?.(updated)
  }

  return (
    <div style={{
      background:   'var(--surface3)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      overflow:     'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding:        '14px 24px',
        borderBottom:   '1px solid rgba(255,255,255,0.06)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Status do Mês — Caixa Tático
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            padding:      '3px 10px',
            background:   meta.bg,
            border:       `1px solid ${meta.border}`,
            borderRadius: '20px',
            fontSize:     '11px',
            fontWeight:   600,
            color:        meta.color,
          }}>
            {meta.label}
          </span>
          <a
            href="/lancamento"
            style={{
              padding:        '5px 12px',
              background:     'transparent',
              border: '1px solid var(--border)',
              borderRadius:   '7px',
              fontSize:       '12px',
              color:          'var(--text-sec)',
              textDecoration: 'none',
              fontWeight:     500,
            }}
          >
            Ver lançamentos
          </a>
        </div>
      </div>

      {/* Main financial metrics */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Key numbers row */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '16px' }}>
          <div style={{ flex: 1, paddingRight: '20px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
              Utilizado
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: meta.color, letterSpacing: '-0.5px' }}>
              {fmt(usedThisMonth)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              de {fmt(tacticalPool)} planejados
            </div>
          </div>

          <div style={{ flex: 1, paddingLeft: '20px' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
              {excedido > 0 ? 'Excedente' : 'Disponível'}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: excedido > 0 ? '#f87171' : '#4ade80', letterSpacing: '-0.5px' }}>
              {excedido > 0 ? fmt(excedido) : fmt(disponivel)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {excedido > 0 ? 'além do caixa tático' : 'restante para oportunidades'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Utilização do caixa</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: meta.color }}>{pctUsed.toFixed(0)}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--surface3)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width:      `${Math.min(100, pctUsed).toFixed(1)}%`,
            height:     '8px',
            background: excedido > 0
              ? 'linear-gradient(90deg, #f87171, #ef4444)'
              : pctUsed > 75
              ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
              : 'linear-gradient(90deg, #4ade80, #22c55e)',
            borderRadius: '4px',
          }} />
        </div>
      </div>

      {/* Contributions list */}
      <div style={{ padding: '16px 24px' }}>
        {editingContribution && typeof document !== 'undefined' && (
          <EditContributionModal
            contribution={editingContribution}
            onClose={() => setEditingContribution(null)}
            onSave={handleSaveEdit}
          />
        )}

        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
          Aportes este mês
        </div>

        {contributions.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
            Nenhum aporte registrado neste mês.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {contributions.slice(0, 5).map(c => {
              const dateLabel = new Date(c.contribution_date + 'T00:00:00')
                .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <div key={c.id} style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '12px',
                  padding:      '10px 14px',
                  background:   'var(--surface3)',
                  border:       '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-sec)', width: '110px', flexShrink: 0 }}>
                    {dateLabel}
                  </span>
                  <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.notes ?? '—'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                    {fmt(c.amount)}
                  </span>
                  <button
                    onClick={() => setEditingContribution(c)}
                    style={{
                      background:   'rgba(99,102,241,0.12)',
                      border:       '1px solid rgba(99,102,241,0.3)',
                      borderRadius: '6px',
                      color:        '#818cf8',
                      cursor:       'pointer',
                      fontSize:     '11px',
                      fontWeight:   600,
                      padding:      '4px 8px',
                      lineHeight:   1,
                      flexShrink:   0,
                    }}
                  >✎</button>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '14px', textAlign: 'right' }}>
          <a href="/lancamento" style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}>
            Ver histórico completo em lançamentos →
          </a>
        </div>
      </div>
    </div>
  )
}
