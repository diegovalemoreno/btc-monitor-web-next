'use client'

import type { DcaAllocation } from '@/lib/dca-tactical/types'

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)

interface Props {
  allocation: DcaAllocation
}

function Bar({ label, amount, total, color, dim }: {
  label:  string
  amount: number
  total:  number
  color:  string
  dim:    string
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-sec)' }}>{label}</span>
        <span style={{ fontSize: '14px', fontWeight: 700, color, fontFamily: "'Courier New', monospace" }}>
          {fmt(amount)}
        </span>
      </div>
      <div style={{
        height:       '6px',
        background:   'var(--surface3)',
        borderRadius: '3px',
        overflow:     'hidden',
      }}>
        <div style={{
          width:        `${pct.toFixed(1)}%`,
          height:       '6px',
          background:   color,
          borderRadius: '3px',
          transition:   'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

export default function DcaCapitalAllocationCard({ allocation }: Props) {
  const {
    monthlyContribution,
    structuralDcaAmount,
    tacticalContributionAmount,
    tacticalReserveAmount,
    usedTacticalThisMonth,
    remainingTactical,
  } = allocation

  const tacticalPool = monthlyContribution - structuralDcaAmount

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
      marginBottom: '24px',
    }}>
      {/* Header */}
      <div style={{
        padding:      '18px 24px',
        borderBottom: '1px solid var(--border-dim)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Alocação de capital
        </div>
        <div style={{
          fontSize:     '18px',
          fontWeight:   700,
          color:        'var(--text)',
          fontFamily:   "'Courier New', monospace",
        }}>
          {fmt(monthlyContribution)}
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px', fontFamily: 'sans-serif' }}>
            / mês
          </span>
        </div>
      </div>

      {/* Stacked bar visual */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{
          display:      'flex',
          height:       '10px',
          borderRadius: '5px',
          overflow:     'hidden',
          marginBottom: '16px',
          gap:          '2px',
        }}>
          <div style={{
            width:      `${(structuralDcaAmount / monthlyContribution * 100).toFixed(1)}%`,
            background: 'var(--orange)',
            borderRadius: '5px 0 0 5px',
          }} />
          <div style={{
            width:      `${(tacticalContributionAmount / monthlyContribution * 100).toFixed(1)}%`,
            background: '#00BCD4',
          }} />
          <div style={{
            flex:       1,
            background: 'var(--surface3)',
            borderRadius: '0 5px 5px 0',
          }} />
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Legend color="var(--orange)" label="DCA estrutural" />
          <Legend color="#00BCD4"       label="Aporte tático agora" />
          <Legend color="var(--surface3)" label="Reserva tática" border="var(--border-strong)" />
        </div>
      </div>

      {/* Amounts */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Bar
          label="DCA estrutural"
          amount={structuralDcaAmount}
          total={monthlyContribution}
          color="var(--orange)"
          dim="var(--orange-dim)"
        />
        <Bar
          label="Aporte tático sugerido agora"
          amount={tacticalContributionAmount}
          total={monthlyContribution}
          color="#00BCD4"
          dim="rgba(0,188,212,0.12)"
        />
        <Bar
          label="Reserva tática sugerida"
          amount={tacticalReserveAmount}
          total={monthlyContribution}
          color="var(--text-muted)"
          dim="var(--surface3)"
        />
      </div>

      {/* Tactical pool tracking */}
      {(usedTacticalThisMonth > 0 || tacticalPool > 0) && (
        <div style={{
          padding:    '16px 24px',
          background: 'var(--surface2)',
          borderTop:  '1px solid var(--border-dim)',
          display:    'flex',
          gap:        '24px',
          flexWrap:   'wrap',
        }}>
          <Stat label="Caixa tático do mês" value={fmt(tacticalPool)} />
          <Stat label="Usado no mês"         value={fmt(usedTacticalThisMonth)} color={usedTacticalThisMonth > 0 ? 'var(--orange)' : undefined} />
          <Stat label="Restante"             value={fmt(remainingTactical)} />
        </div>
      )}
    </div>
  )
}

function Legend({ color, label, border }: { color: string; label: string; border?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width:        '10px',
        height:       '10px',
        borderRadius: '2px',
        background:   color,
        border:       border ? `1px solid ${border}` : 'none',
        flexShrink:   0,
      }} />
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: color ?? 'var(--text-sec)', fontFamily: "'Courier New', monospace" }}>
        {value}
      </div>
    </div>
  )
}
