'use client'

import type { HistoricalReturnRow } from '@/lib/dca/historical-returns'

const fmtPct = (n: number) => (n > 0 ? `+${n}%` : `${n}%`)

interface Props { rows: HistoricalReturnRow[] }

export default function DcaHistoricalReturns({ rows }: Props) {
  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      overflow:     'hidden',
    }}>
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Retorno histórico por condição de mercado
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          DCA mensal em cada faixa de score — retornos médios históricos 2018–2024
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Score', '3 meses', '6 meses', '12 meses', 'Referências'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const highlight = row.isCurrent
              const bg        = highlight ? 'rgba(132, 204, 22, 0.06)' : 'transparent'
              const border    = highlight ? '1px solid rgba(132, 204, 22, 0.2)' : '1px solid transparent'
              return (
                <tr key={row.scoreRange} style={{ background: bg, outline: border }}>
                  <td style={{ padding: '12px 16px', fontWeight: highlight ? 800 : 400, color: highlight ? '#84cc16' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {row.scoreRange} {highlight && '◀ agora'}
                  </td>
                  {([row.return3m, row.return6m, row.return12m] as number[]).map((v, i) => (
                    <td key={i} style={{ padding: '12px 16px', fontWeight: highlight ? 700 : 400, color: v >= 0 ? (highlight ? '#84cc16' : 'var(--text)') : '#f97316', whiteSpace: 'nowrap' }}>
                      {fmtPct(v)}
                    </td>
                  ))}
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                    {row.references.join(', ') || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
