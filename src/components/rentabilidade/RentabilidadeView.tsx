'use client'

import { useState, useEffect, useMemo } from 'react'
import type { DcaContributionRow } from '@/lib/db/types'
import Tooltip from '@/components/shared/Tooltip'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

function pct(n: number, decimals = 1) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals).replace('.', ',')}%`
}

function returnColor(r: number | null): string {
  if (r === null) return 'transparent'
  if (r >= 200)  return 'rgba(34,197,94,0.35)'
  if (r >= 100)  return 'rgba(34,197,94,0.22)'
  if (r >= 50)   return 'rgba(34,197,94,0.14)'
  if (r >= 20)   return 'rgba(34,197,94,0.09)'
  if (r >= 0)    return 'rgba(34,197,94,0.05)'
  if (r >= -10)  return 'rgba(239,68,68,0.06)'
  if (r >= -20)  return 'rgba(239,68,68,0.12)'
  return               'rgba(239,68,68,0.22)'
}

function textColor(r: number | null): string {
  if (r === null) return 'var(--text-muted)'
  return r >= 0 ? '#22C55E' : '#EF4444'
}

interface MonthReturn {
  invested: number
  sats:     number
  return:   number | null
}

interface YearRow {
  year:    number
  months:  (MonthReturn | null)[]
  annual:  number | null
  cumInv:  number
  cumSats: number
}

function buildReturnTable(
  contributions: DcaContributionRow[],
  btcPrice: number | null,
): YearRow[] {
  if (!btcPrice || contributions.length === 0) return []

  const purchases = contributions.filter(
    c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda')
  )
  if (purchases.length === 0) return []

  const years = Array.from(new Set(
    purchases.map(c => new Date(c.contribution_date + 'T00:00:00').getFullYear())
  )).sort()

  const rows: YearRow[] = []
  let cumInv  = 0
  let cumSats = 0

  for (const year of years) {
    const months: (MonthReturn | null)[] = Array(12).fill(null)
    let yearInv  = 0
    let yearSats = 0

    for (let m = 0; m < 12; m++) {
      const monthContribs = purchases.filter(c => {
        const d = new Date(c.contribution_date + 'T00:00:00')
        return d.getFullYear() === year && d.getMonth() === m
      })
      if (monthContribs.length === 0) continue

      const invested = monthContribs.reduce((s, c) => s + c.amount, 0)
      const sats     = monthContribs.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
      const avgEntry = sats > 0 ? (invested / (sats / 1e8)) : null
      const ret      = avgEntry !== null ? ((btcPrice - avgEntry) / avgEntry) * 100 : null

      months[m] = { invested, sats, return: ret }
      yearInv  += invested
      yearSats += sats
    }

    cumInv  += yearInv
    cumSats += yearSats

    const yearAvgEntry = yearSats > 0 ? (yearInv / (yearSats / 1e8)) : null
    const annualReturn = yearAvgEntry !== null ? ((btcPrice - yearAvgEntry) / yearAvgEntry) * 100 : null

    rows.push({ year, months, annual: annualReturn, cumInv, cumSats })
  }

  return rows.reverse()
}

interface Props { initialContributions: DcaContributionRow[] }

export default function RentabilidadeView({ initialContributions }: Props) {
  const [btcPrice, setBtcPrice] = useState<number | null>(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch('/api/btc-price-brl')
      .then(r => r.ok ? r.json() : null)
      .then((d: { btcPriceBrl?: number } | null) => { if (d?.btcPriceBrl) setBtcPrice(d.btcPriceBrl) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(
    () => buildReturnTable(initialContributions, btcPrice),
    [initialContributions, btcPrice]
  )

  const purchases = initialContributions.filter(
    c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda')
  )
  const totalInv  = purchases.reduce((s, c) => s + c.amount, 0)
  const totalSats = purchases.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
  const totalVal  = btcPrice !== null ? (totalSats / 1e8) * btcPrice : null
  const totalRet  = totalVal !== null && totalInv > 0 ? ((totalVal - totalInv) / totalInv) * 100 : null

  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        Carregando cotação…
      </div>
    )
  }

  if (!btcPrice || rows.length === 0) {
    return (
      <div style={{ padding: '32px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
        {!btcPrice ? 'Não foi possível carregar a cotação atual do Bitcoin.' : 'Nenhum aporte com BTC registrado encontrado.'}
      </div>
    )
  }

  return (
    <div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <KPICard
          label="Total investido"
          value={fmt0(totalInv)}
          accent="var(--orange)"
          tooltip="Soma de todos os valores aportados em reais ao longo do histórico, incluindo todos os tipos de aporte com BTC registrado."
        />
        <KPICard
          label="Valor atual (BTC)"
          value={totalVal !== null ? fmt0(totalVal) : '—'}
          accent="#22C55E"
          valueColor={totalRet !== null ? (totalRet >= 0 ? '#22C55E' : '#EF4444') : 'var(--text)'}
          tooltip={"Valor atual do portfólio de Bitcoin ao preço de mercado.\n\nCálculo: Total de BTC acumulado × Preço atual do BTC em R$"}
        />
        <KPICard
          label="Retorno total"
          value={totalRet !== null ? pct(totalRet, 2) : '—'}
          accent={totalRet !== null ? (totalRet >= 0 ? '#22C55E' : '#EF4444') : '#6366F1'}
          valueColor={totalRet !== null ? (totalRet >= 0 ? '#22C55E' : '#EF4444') : 'var(--text)'}
          tooltip={"Retorno não realizado sobre o total investido.\n\nCálculo: (Valor atual − Total investido) ÷ Total investido × 100\n\n✅ Positivo: portfólio acima do custo de aquisição.\n🔴 Negativo: portfólio abaixo do custo médio."}
        />
        <KPICard
          label="Preço BTC atual"
          value={fmt0(btcPrice)}
          accent="#F7931A"
          tooltip={"Cotação atual do Bitcoin em reais.\n\nFonte: CoinGecko (atualizado a cada 2 minutos).\n\nUsada como base para calcular todos os retornos desta página."}
        />
      </div>

      {/* Annual bar chart */}
      <AnnualBarChart rows={rows} />

      {/* Return table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Rentabilidade por Ano</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '10px' }}>
            Retorno calculado sobre o preço atual do BTC (R$ {fmt0(btcPrice).replace('R$ ', '')})
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                <th style={thStyle}>Ano</th>
                {MONTHS.map(m => <th key={m} style={thStyle}>{m}</th>)}
                <th style={{ ...thStyle, color: 'var(--orange)' }}>Retorno Anual</th>
                <th style={{ ...thStyle, color: 'var(--text-sec)' }}>Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const cumRet = row.cumSats > 0 && btcPrice
                  ? ((btcPrice - row.cumInv / (row.cumSats / 1e8)) / (row.cumInv / (row.cumSats / 1e8))) * 100
                  : null
                return (
                  <tr key={row.year} style={{ borderBottom: ri < rows.length - 1 ? '1px solid var(--border-dim)' : 'none' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--text)', background: 'var(--surface2)' }}>
                      {row.year}
                    </td>
                    {row.months.map((m, mi) => (
                      <td key={mi} style={{ ...tdStyle, background: returnColor(m?.return ?? null), color: textColor(m?.return ?? null) }}>
                        {m !== null && m.return !== null ? pct(m.return, 0) : <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>·</span>}
                      </td>
                    ))}
                    <td style={{ ...tdStyle, fontWeight: 700, color: textColor(row.annual), background: returnColor(row.annual) }}>
                      {row.annual !== null ? pct(row.annual, 1) : '—'}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: textColor(cumRet) }}>
                      {cumRet !== null ? pct(cumRet, 1) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border-dim)', fontSize: '11px', color: 'var(--text-muted)' }}>
          Cada célula mostra o retorno não realizado dos aportes feitos naquele mês, calculado como (preço atual − preço médio de entrada) ÷ preço médio de entrada × 100. Meses sem aportes são omitidos (·).
        </div>
      </div>

    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding:    '10px 12px',
  textAlign:  'center',
  fontWeight: 600,
  fontSize:   '10px',
  color:      'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  whiteSpace: 'nowrap',
  background: 'var(--surface)',
}

const tdStyle: React.CSSProperties = {
  padding:   '9px 10px',
  textAlign: 'center',
  fontSize:  '12px',
  fontFamily: "'Courier New', monospace",
  whiteSpace: 'nowrap',
}

function KPICard({ label, value, accent, valueColor, tooltip }: {
  label: string; value: string; accent: string; valueColor?: string; tooltip?: string
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: '12px', padding: '18px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</span>
        {tooltip && <Tooltip text={tooltip} position="bottom" wide />}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: valueColor ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
    </div>
  )
}

function AnnualBarChart({ rows }: { rows: YearRow[] }) {
  const data = [...rows].reverse()
  if (data.length === 0) return null

  const maxAbs = Math.max(...data.map(r => Math.abs(r.annual ?? 0)), 1)
  const MAX_H  = 140

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>Retorno Anual por Ano</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
        {data.map(row => {
          const r     = row.annual ?? 0
          const pos   = r >= 0
          const color = pos ? '#22C55E' : '#EF4444'
          const h     = Math.max(4, (Math.abs(r) / maxAbs) * MAX_H)
          const label = row.annual !== null ? pct(r, 0) : ''
          return (
            <div key={row.year} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0, minWidth: '52px' }}>
              {/* value above bar */}
              <div style={{ fontSize: '10px', fontWeight: 700, color, fontFamily: "'Courier New', monospace", lineHeight: '14px', minHeight: '14px' }}>
                {label}
              </div>
              {/* bar */}
              <div style={{ width: '38px', height: `${h}px`, background: color, borderRadius: pos ? '4px 4px 0 0' : '0 0 4px 4px', opacity: 0.82 }} />
              {/* year */}
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>{row.year}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
