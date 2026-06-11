'use client'

interface Props {
  hashrateEhs:      number | null
  hashrate7dPct:    number | null
  difficultyT:      number | null
  nextAdjustPct:    number | null
  remainingBlocks:  number | null
  epochProgressPct: number | null
}

function fEhs(v: number | null): string {
  if (v == null) return '—'
  return v.toFixed(1) + ' EH/s'
}

function fDiff(v: number | null): string {
  if (v == null) return '—'
  return v.toFixed(2) + ' T'
}

function fPct(v: number | null, sign = true): string {
  if (v == null) return '—'
  const s = sign && v > 0 ? '+' : ''
  return `${s}${v.toFixed(1)}%`
}

function adjColor(v: number | null): string {
  if (v == null) return 'var(--text)'
  if (v > 3)  return '#4ade80'
  if (v > 0)  return '#86efac'
  if (v > -3) return '#fca5a5'
  return '#f87171'
}

export default function MiningStatsRow({
  hashrateEhs,
  hashrate7dPct,
  difficultyT,
  nextAdjustPct,
  remainingBlocks,
  epochProgressPct,
}: Props) {
  const kpis = [
    {
      label: 'Hashrate',
      value: fEhs(hashrateEhs),
      sub:   hashrate7dPct != null
        ? { text: fPct(hashrate7dPct) + ' (7d)', color: hashrate7dPct >= 0 ? '#4ade80' : '#f87171' }
        : null,
    },
    {
      label: 'Dificuldade',
      value: fDiff(difficultyT),
      sub:   null,
    },
    {
      label: 'Próx. Ajuste',
      value: nextAdjustPct != null ? fPct(nextAdjustPct) : '—',
      valueColor: adjColor(nextAdjustPct),
      sub:   remainingBlocks != null
        ? { text: `em ${remainingBlocks} blocos`, color: 'var(--text-muted)' }
        : null,
    },
    {
      label: 'Época Atual',
      value: epochProgressPct != null ? fPct(epochProgressPct, false) : '—',
      sub:   null,
    },
  ]

  return (
    <div
      style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        borderBottom:        '1px solid var(--border)',
        borderTop:           '1px solid var(--border)',
        marginTop:           '-1px',
      }}
    >
      {kpis.map(({ label, value, sub, valueColor }, i) => (
        <div
          key={label}
          style={{
            padding:     '14px 20px',
            borderRight: i < kpis.length - 1 ? '1px solid var(--border)' : 'none',
            transition:  'background 0.15s',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--orange-subtle)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
              {label}
            </div>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: valueColor ?? 'var(--text)' }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: '11px', color: sub.color, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
              {sub.text}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
