'use client'

import type { DcaContributionRow } from '@/lib/db/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

type MonthStatus = 'not_started' | 'partial' | 'completed' | 'exceeded'

function getMonthStatus(used: number, pool: number): MonthStatus {
  if (used <= 0)          return 'not_started'
  if (used > pool)        return 'exceeded'
  if (used >= pool * 0.99) return 'completed'
  return 'partial'
}

const STATUS_META: Record<MonthStatus, { label: string; color: string; bg: string; border: string }> = {
  not_started: { label: 'Não iniciado', color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
  partial:     { label: 'Em andamento', color: '#F59E0B',                bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  completed:   { label: 'Concluído',    color: '#22C55E',                bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)' },
  exceeded:    { label: 'Excedido',     color: '#EF4444',                bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
}

interface Props {
  tacticalPool:  number
  contributions: DcaContributionRow[]
  usedThisMonth: number
}

export default function DcaStatusDoMesCard({ tacticalPool, contributions, usedThisMonth }: Props) {
  const status   = getMonthStatus(usedThisMonth, tacticalPool)
  const meta     = STATUS_META[status]
  const pctUsed  = tacticalPool > 0 ? Math.min(100, (usedThisMonth / tacticalPool) * 100) : 0
  const excedido = usedThisMonth > tacticalPool ? usedThisMonth - tacticalPool : 0
  const disponivel = Math.max(0, tacticalPool - usedThisMonth)

  return (
    <div style={{
      background:   'rgba(255,255,255,0.02)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '16px',
    }}>
      {/* Header */}
      <div style={{
        padding:        '14px 24px',
        borderBottom:   '1px solid rgba(255,255,255,0.06)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
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
              border:         '1px solid rgba(255,255,255,0.12)',
              borderRadius:   '7px',
              fontSize:       '12px',
              color:          'rgba(255,255,255,0.45)',
              textDecoration: 'none',
              fontWeight:     500,
            }}
          >
            Ver lançamentos
          </a>
        </div>
      </div>

      {/* Progress */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            <span style={{ fontWeight: 700, color: meta.color }}>{fmt(usedThisMonth)}</span>
            {' '}aportados de {fmt(tacticalPool)} na caixa tática
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: meta.color }}>
            {pctUsed.toFixed(0)}%
          </span>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            width:        `${pctUsed.toFixed(1)}%`,
            height:       '6px',
            background:   meta.color,
            borderRadius: '3px',
          }} />
        </div>

        {/* Exceeded breakdown */}
        {excedido > 0 && (
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
            {[
              { label: 'Caixa planejado', value: fmt(tacticalPool),  color: 'rgba(255,255,255,0.5)' },
              { label: 'Já aportado',     value: fmt(usedThisMonth), color: '#EF4444' },
              { label: 'Excedente',       value: fmt(excedido),      color: '#EF4444' },
              { label: 'Disponível',      value: fmt(0),              color: 'rgba(255,255,255,0.25)' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Available (non-exceeded) */}
        {excedido === 0 && usedThisMonth > 0 && (
          <div style={{ display: 'flex', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700, marginBottom: '4px' }}>Disponível</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#22C55E' }}>{fmt(disponivel)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Contributions list - read only */}
      <div style={{ padding: '16px 24px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '12px' }}>
          Aportes este mês
        </div>

        {contributions.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>
            Nenhum aporte registrado neste mês.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {contributions.slice(0, 5).map(c => {
              const dateLabel = new Date(c.contribution_date + 'T00:00:00')
                .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <div key={c.id} style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         '12px',
                  padding:     '10px 14px',
                  background:  'rgba(255,255,255,0.02)',
                  border:      '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', width: '110px', flexShrink: 0 }}>
                    {dateLabel}
                  </span>
                  <span style={{ flex: 1, fontSize: '12px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.notes ?? '—'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {fmt(c.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '14px', textAlign: 'right' }}>
          <a
            href="/lancamento"
            style={{ fontSize: '12px', color: '#f59e0b', textDecoration: 'none', fontWeight: 500 }}
          >
            Ver histórico completo →
          </a>
        </div>
      </div>
    </div>
  )
}
