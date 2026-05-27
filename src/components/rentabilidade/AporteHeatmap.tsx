import { colorForReturn, textColorForReturn } from '@lib/rentabilidade/compute'
import type { HeatmapCell } from '@lib/rentabilidade/types'

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatReturn(pct: number): string {
  const abs = Math.abs(pct)
  if (abs >= 100) return `${pct >= 0 ? '+' : ''}${Math.round(pct)}%`
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`
}

interface Props { heatmap: HeatmapCell[] }

export default function AporteHeatmap({ heatmap }: Props) {
  if (heatmap.length === 0) return null

  const years = Array.from(new Set(heatmap.map(c => c.year))).sort()

  const lookup = new Map<string, { cell: HeatmapCell; totalAmountBrl: number }>()
  for (const c of heatmap) {
    const key = `${c.year}-${c.month}`
    const existing = lookup.get(key)
    if (!existing || c.returnPct > existing.cell.returnPct) {
      lookup.set(key, { cell: c, totalAmountBrl: (existing?.totalAmountBrl ?? 0) + c.amountBrl })
    } else {
      lookup.set(key, { ...existing, totalAmountBrl: existing.totalAmountBrl + c.amountBrl })
    }
  }

  return (
    <div style={{
      background:   'rgba(255,255,255,0.02)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      padding:      '16px 18px',
    }}>
      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>
        Retorno por Aporte
      </div>

      {/* Month header */}
      <div style={{ display: 'grid', gridTemplateColumns: '36px repeat(12, 1fr)', gap: '4px', marginBottom: '4px' }}>
        <div />
        {MONTH_LABELS.map(m => (
          <div key={m} style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{m}</div>
        ))}
      </div>

      {/* Year rows */}
      {years.map(year => (
        <div key={year} style={{ display: 'grid', gridTemplateColumns: '36px repeat(12, 1fr)', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
          <div style={{ fontSize: '7.5px', color: 'rgba(255,255,255,0.35)', textAlign: 'right', paddingRight: '6px' }}>
            {year}
          </div>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
            const entry = lookup.get(`${year}-${month}`)
            if (!entry) {
              return (
                <div key={month} style={{ height: '22px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }} />
              )
            }
            const { cell, totalAmountBrl } = entry
            const bg   = colorForReturn(cell.returnPct)
            const text = textColorForReturn(cell.returnPct)
            return (
              <div
                key={month}
                title={`${new Date(cell.date + 'T00:00:00').toLocaleDateString('pt-BR')} · ${formatReturn(cell.returnPct)} · R$${Math.round(totalAmountBrl).toLocaleString('pt-BR')}`}
                style={{
                  height:          '22px',
                  borderRadius:    '3px',
                  background:      bg,
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  cursor:          'default',
                }}
              >
                <span style={{ fontSize: '6px', color: text, fontWeight: 700, letterSpacing: '-0.3px' }}>
                  {formatReturn(cell.returnPct)}
                </span>
              </div>
            )
          })}
        </div>
      ))}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
        <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)' }}>Prejuízo</span>
        <div style={{ height: '5px', flex: 1, background: 'linear-gradient(to right, #7f1d1d, #991b1b, #166534, #22c55e, #86efac, #dcfce7)', borderRadius: '3px' }} />
        <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)' }}>Lucro</span>
      </div>
    </div>
  )
}
