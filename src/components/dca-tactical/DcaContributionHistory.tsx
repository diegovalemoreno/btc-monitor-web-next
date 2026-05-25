'use client'

import { useState, useEffect, useMemo } from 'react'
import type { DcaContributionRow, ContributionType } from '@/lib/db/types'
import DcaPatrimonyChart from './DcaPatrimonyChart'
import Tooltip from '@/components/shared/Tooltip'

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

type ActiveTab = 'historico' | 'evolucao'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
type PageSize = typeof PAGE_SIZE_OPTIONS[number]

interface Props { initialContributions: DcaContributionRow[] }

export default function DcaContributionHistory({ initialContributions }: Props) {
  const [contributions, setContributions] = useState<DcaContributionRow[]>(initialContributions)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [filterType, setFilterType]       = useState<ContributionType | 'ALL'>('ALL')
  const [periodFilter, setPeriodFilter]   = useState<PeriodFilter>('thisMonth')
  const [customFrom, setCustomFrom]       = useState('')
  const [customTo, setCustomTo]           = useState('')
  const [expandedId, setExpandedId]       = useState<string | null>(null)
  const [activeTab, setActiveTab]         = useState<ActiveTab>('historico')

  // Pagination
  const [currentPage, setCurrentPage]   = useState(1)
  const [pageSize, setPageSize]         = useState<PageSize>(25)
  const [goToPageInput, setGoToPageInput] = useState('')

  // BTC price BRL
  const [btcPriceBrl, setBtcPriceBrl]   = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/btc-price-brl')
      .then(r => r.ok ? r.json() : null)
      .then((d: { btcPriceBrl?: number } | null) => {
        if (d?.btcPriceBrl) setBtcPriceBrl(d.btcPriceBrl)
      })
      .catch(() => {})
  }, [])

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

  // Reset page when filters change
  const filteredKey = `${filterType}|${periodFilter}|${customFrom}|${customTo}`
  useEffect(() => { setCurrentPage(1) }, [filteredKey])

  // Pagination math
  const totalItems  = filtered.length
  const totalPages  = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage    = Math.min(currentPage, totalPages)
  const startIdx    = (safePage - 1) * pageSize
  const endIdx      = Math.min(startIdx + pageSize, totalItems)
  const pageItems   = filtered.slice(startIdx, endIdx)

  // Group page items by month
  const groups = pageItems.reduce<Record<string, DcaContributionRow[]>>((acc, c) => {
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

  // Derived metrics vs current BTC price
  const priceDiffAbs = btcPriceBrl !== null && avgPriceBrl !== null ? btcPriceBrl - avgPriceBrl : null
  const priceDiffPct = priceDiffAbs !== null && avgPriceBrl !== null ? (priceDiffAbs / avgPriceBrl) * 100 : null

  // Rentabilidade ponderada: (currentValue - totalInvested) / totalInvested
  const totalInvested   = withSats.reduce((s, c) => s + c.amount, 0)
  const currentBtcValue = btcPriceBrl !== null ? (totalSats / 1e8) * btcPriceBrl : null
  const rentabilidade   = currentBtcValue !== null && totalInvested > 0
    ? ((currentBtcValue - totalInvested) / totalInvested) * 100
    : null

  // Fee analytics — period filtered BTC purchases with fee data
  const btcPurchasesFiltered = periodFiltered.filter(c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
  const feesKnown     = btcPurchasesFiltered.filter(c => extractFee(c.notes) !== null)
  const totalFees     = feesKnown.reduce((s, c) => s + (extractFee(c.notes) ?? 0), 0)
  const totalSpread   = btcPurchasesFiltered
    .filter(c => c.effective_price_brl && c.btc_price_brl)
    .reduce((s, c) => s + (c.effective_price_brl! - c.btc_price_brl!) * (c.sats_purchased! / 1e8), 0)
  const totalImpact   = totalFees + Math.max(0, totalSpread - totalFees)

  // Period-filtered totals (drives the summary strip under filters)
  const filteredPurchases   = filtered.filter(c => !c.notes?.includes('Venda'))
  const periodTotalBRL      = filteredPurchases.reduce((s, c) => s + c.amount, 0)
  const periodTotalSats     = filteredPurchases.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
  const periodTotalFees     = filtered.reduce((s, c) => s + (extractFee(c.notes) ?? 0), 0)

  const priceEvolution = useMemo(() => buildPriceEvolution(contributions), [contributions])

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

  function handleGoToPage(e: React.FormEvent) {
    e.preventDefault()
    const n = parseInt(goToPageInput, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      setCurrentPage(n)
      setGoToPageInput('')
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
        <SummaryItem
          label="Total de aportes"
          value={String(contributions.length)}
          tooltip="Quantidade total de aportes registrados no histórico, incluindo todos os tipos (Tático, Estrutural e Manual). Aportes deletados são ocultados."
        />
        <SummaryItem
          label="Volume total"
          value={fmt(totalAmount)}
          color="var(--orange)"
          tooltip="Soma de todos os valores aportados em reais ao longo de todo o histórico, independente do período ou filtro selecionado."
        />
        {totalSats > 0 && (
          <SummaryItem
            label="Total BTC"
            value={fmtBTC(totalSats)}
            color="#F7931A"
            tooltip="Total de Bitcoin acumulado em todos os aportes de compra, expresso em BTC.\n\n1 BTC = 100.000.000 satoshis (sats). Vendas são excluídas deste cálculo."
          />
        )}
        {avgPriceBrl !== null && (
          <SummaryItem
            label="Preço médio acumulado"
            value={fmtBRL0(avgPriceBrl) + '/BTC'}
            color="#22C55E"
            hint={`Total R$ ÷ total BTC (${withSats.length} aportes)`}
            tooltip={`Custo médio ponderado de aquisição do Bitcoin.\n\nCálculo: Total investido (R$) ÷ Total BTC acumulado\n\nEste é o preço de equilíbrio — se o BTC estiver acima dele, seu portfólio está no lucro. Baseado em ${withSats.length} aportes com BTC registrado.`}
          />
        )}
        {btcPriceBrl !== null && (
          <SummaryItem
            label="Preço atual BTC"
            value={fmtBRL0(btcPriceBrl) + '/BTC'}
            color="#F7931A"
            tooltip="Cotação atual do Bitcoin em reais, atualizada a cada 2 minutos.\n\nFonte: CoinGecko (com fallback para Mercado Bitcoin)."
          />
        )}
        {priceDiffPct !== null && priceDiffAbs !== null && (
          <SummaryItem
            label="Variação vs PM"
            value={(priceDiffPct >= 0 ? '+' : '') + priceDiffPct.toFixed(2).replace('.', ',') + '%'}
            color={priceDiffPct >= 0 ? '#22C55E' : '#EF4444'}
            hint={(priceDiffAbs >= 0 ? '+' : '') + fmtBRL0(priceDiffAbs) + '/BTC'}
            tooltip={`Diferença entre o preço atual do BTC e seu preço médio acumulado.\n\nCálculo: (Preço atual − Preço médio) ÷ Preço médio × 100\n\n✅ Positivo (verde): BTC está acima do seu custo médio — portfólio valorizado.\n🔴 Negativo (vermelho): BTC abaixo do custo médio — portfólio desvalorizado.`}
          />
        )}
        {rentabilidade !== null && (
          <SummaryItem
            label="Rentabilidade"
            value={(rentabilidade >= 0 ? '+' : '') + rentabilidade.toFixed(2).replace('.', ',') + '%'}
            color={rentabilidade >= 0 ? '#22C55E' : '#EF4444'}
            hint={currentBtcValue !== null ? 'Valor atual: ' + fmt(currentBtcValue) : undefined}
            tooltip={`Retorno não realizado do portfólio completo ao preço atual.\n\nCálculo: (Valor atual em BTC − Total investido) ÷ Total investido × 100\n\nValor atual = Total de sats × Preço atual do BTC em R$.\n\nEste valor muda conforme o preço do BTC oscila e não considera impostos ou taxas de saque.`}
          />
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
        {([['historico', 'Histórico'], ['evolucao', 'Evolução do Preço Médio']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--orange)' : 'transparent'}`,
              color: activeTab === tab ? 'var(--orange)' : 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Evolução do Preço Médio ── */}
      {activeTab === 'evolucao' && (
        <div>
          {priceEvolution.length > 0 ? (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', overflow: 'hidden',
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                      {(['Mês', 'Preço médio acumulado', 'BTC acumulado', 'Total investido'] as const).map(h => (
                        <th key={h} style={{
                          padding: '10px 20px', fontSize: '10px', color: 'var(--text-muted)',
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
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Nenhum dado de preço disponível.
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Histórico ── */}
      {activeTab === 'historico' && (
        <div>

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
                <FeeMetric
                  label="Taxas pagas"
                  value={fmt(totalFees)}
                  color="#F59E0B"
                  hint="Taxa explícita cobrada pela plataforma"
                  tooltip={'Soma das taxas explícitas pagas à plataforma de compra no período selecionado.\n\nExtraídas automaticamente das notas do aporte no formato "taxa R$X". Registre o valor da taxa no campo Outros Custos ao registrar um aporte para aparecer aqui.'}
                />
                <FeeMetric
                  label="Spread acumulado"
                  value={fmt(Math.max(0, totalSpread - totalFees))}
                  color="#F97316"
                  hint="Diferença entre cotação e preço efetivo"
                  tooltip="Custo oculto gerado pela diferença entre a cotação de referência do mercado e o preço efetivo que você pagou.\n\nCálculo: (Preço efetivo − Cotação BTC) × BTC comprado − Taxas pagas\n\nO spread é o lucro da plataforma embutido no preço, separado da taxa explícita."
                />
                <FeeMetric
                  label="Impacto total"
                  value={fmt(totalImpact)}
                  color="#EF4444"
                  hint="Custo total acima do preço de mercado"
                  tooltip="Custo total que você pagou acima do preço de mercado no período.\n\nImpacto total = Taxas pagas + Spread acumulado\n\nRepresenta quanto a mais você pagou por BTC em comparação a comprar exatamente pela cotação de mercado, sem custos."
                />
                <FeeMetric
                  label="Aportes analisados"
                  value={`${feesKnown.length}`}
                  hint="Com dados de taxa registrados"
                  tooltip={`Quantidade de aportes do período que possuem dados de taxa registrados nas notas.\n\nAportes sem o campo Outros Custos preenchido não entram nesta análise. Para análise completa, sempre registre os custos ao fazer um aporte.`}
                />
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

          {/* Period summary strip */}
          {filtered.length > 0 && (
            <div style={{
              display: 'flex', gap: '0', flexWrap: 'wrap',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '10px', marginBottom: '20px', overflow: 'hidden',
            }}>
              <PeriodStat label="Total no período" value={fmt(periodTotalBRL)} color="var(--orange)" />
              {periodTotalSats > 0 && (
                <PeriodStat label="Sats comprados" value={periodTotalSats.toLocaleString('pt-BR') + ' sats'} color="#F7931A" />
              )}
              {periodTotalFees > 0 && (
                <PeriodStat label="Taxas pagas" value={fmt(periodTotalFees)} color="#F59E0B" />
              )}
              <PeriodStat label="Aportes" value={String(filtered.length)} />
            </div>
          )}

          {/* No results */}
          {monthKeys.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              Nenhum aporte encontrado{periodFilter !== 'all' ? ' no período selecionado' : ''}.
            </div>
          )}

          {/* Grouped list */}
          {monthKeys.map(monthKey => {
            const items      = groups[monthKey]
            const purchases  = items.filter(c => !c.notes?.includes('Venda'))
            const monthTotal = purchases.reduce((s, c) => s + c.amount, 0)
            const monthSats  = purchases.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
            const monthFees  = items.reduce((s, c) => s + (extractFee(c.notes) ?? 0), 0)
            return (
              <div key={monthKey} style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', padding: '0 4px', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-sec)', textTransform: 'capitalize' }}>
                    {monthKey}
                  </span>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: "'Courier New', monospace" }}>{fmt(monthTotal)}</span>
                    {monthSats > 0 && (
                      <span style={{ fontSize: '11px', color: '#F7931A', fontFamily: "'Courier New', monospace" }}>
                        {monthSats.toLocaleString('pt-BR')} sats
                      </span>
                    )}
                    {monthFees > 0 && (
                      <span style={{ fontSize: '11px', color: '#F59E0B', fontFamily: "'Courier New', monospace" }}>
                        taxa {fmt(monthFees)}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                  {items.map((c, idx) => {
                    const typeMeta = TYPE_META[c.contribution_type]
                    const d        = new Date(c.contribution_date + 'T00:00:00')
                    const dateStr  = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                    const isExpanded = expandedId === c.id
                    const isVenda  = c.notes?.includes('Venda') || false

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
                          className="contrib-row"
                          style={{
                            cursor: hasPriceData ? 'pointer' : 'default',
                            background: isExpanded ? 'rgba(99,102,241,0.04)' : 'transparent',
                          }}
                          onClick={() => hasPriceData && setExpandedId(isExpanded ? null : c.id)}
                        >
                          {/* Date */}
                          <div className="contrib-date" style={{ minWidth: '110px', flexShrink: 0 }}>
                            <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: 500 }}>{dateStr}</div>
                          </div>

                          {/* Notes + context */}
                          <div className="contrib-notes" style={{ flex: 1, minWidth: 0 }}>
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
                          <div className="contrib-btc" style={{ minWidth: '130px', flexShrink: 0, textAlign: 'right' }}>
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
                          <span className="contrib-badge" style={{
                            padding: '2px 8px', background: `${typeMeta.color}20`, color: typeMeta.color,
                            borderRadius: '12px', fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            {typeMeta.label}
                          </span>

                          {/* Amount */}
                          <span className="contrib-amount" style={{
                            fontSize: '14px', fontWeight: 700,
                            color: isVenda ? '#22C55E' : 'var(--text)',
                            fontFamily: "'Courier New', monospace", textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0,
                          }}>
                            {isVenda ? '+' : ''}{fmt(c.amount)}
                          </span>

                          {/* Expand indicator */}
                          {hasPriceData && (
                            <span className="contrib-expand" style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0 }}>
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          )}

                          {/* Delete */}
                          <button
                            className="contrib-delete"
                            onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
                            disabled={deletingId === c.id}
                            title="Remover aporte"
                            style={{
                              background: 'none', border: 'none',
                              color: deletingId === c.id ? 'var(--text-muted)' : 'rgba(239,68,68,0.5)',
                              cursor: deletingId === c.id ? 'not-allowed' : 'pointer',
                              fontSize: '16px', padding: '0 4px', borderRadius: '4px', lineHeight: 1, flexShrink: 0,
                            }}
                          >
                            {deletingId === c.id ? '…' : '×'}
                          </button>
                        </div>

                        {/* Expanded fee breakdown */}
                        {isExpanded && hasPriceData && (
                          <div style={{
                            padding: '12px 20px 16px 20px',
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

          {/* Pagination footer */}
          {totalItems > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '12px',
              padding: '14px 20px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '10px', marginTop: '8px',
            }}>
              {/* Left: showing info */}
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Mostrando{' '}
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{startIdx + 1}–{endIdx}</span>
                {' '}de{' '}
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{totalItems}</span>
                {' '}registros
              </span>

              {/* Center: page navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PageBtn onClick={() => setCurrentPage(1)} disabled={safePage === 1} label="«" title="Primeira página" />
                <PageBtn onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} label="‹" title="Página anterior" />
                <span style={{ fontSize: '12px', color: 'var(--text)', padding: '0 8px', whiteSpace: 'nowrap' }}>
                  Página <strong>{safePage}</strong> / <strong>{totalPages}</strong>
                </span>
                <PageBtn onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} label="›" title="Próxima página" />
                <PageBtn onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages} label="»" title="Última página" />
              </div>

              {/* Right: go to page + page size */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <form onSubmit={handleGoToPage} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Ir para</label>
                  <input
                    type="number" min={1} max={totalPages}
                    value={goToPageInput}
                    onChange={e => setGoToPageInput(e.target.value)}
                    placeholder={String(safePage)}
                    style={{
                      width: '52px', padding: '4px 8px',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '6px', color: 'var(--text)', fontSize: '12px',
                      textAlign: 'center',
                    }}
                  />
                  <button type="submit" style={{
                    padding: '4px 10px', background: 'var(--surface3)',
                    border: '1px solid var(--border)', borderRadius: '6px',
                    color: 'var(--text-sec)', fontSize: '11px', cursor: 'pointer',
                  }}>
                    Ir
                  </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Por página</label>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value) as PageSize); setCurrentPage(1) }}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '6px', color: 'var(--text)', fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    {PAGE_SIZE_OPTIONS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  )
}

function PageBtn({ onClick, disabled, label, title }: { onClick: () => void; disabled: boolean; label: string; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        padding: '4px 10px', minWidth: '32px',
        background: disabled ? 'transparent' : 'var(--surface3)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        color: disabled ? 'var(--text-muted)' : 'var(--text)',
        fontSize: '14px', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  )
}

function PeriodStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: '10px 20px', flex: '1 1 120px', borderRight: '1px solid var(--border-dim)' }}>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
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

function FeeMetric({ label, value, color, hint, tooltip }: { label: string; value: string; color?: string; hint?: string; tooltip?: string }) {
  return (
    <div style={{ padding: '14px 20px', flex: '1 1 140px', borderRight: '1px solid var(--border-dim)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
        {tooltip && <Tooltip text={tooltip} position="bottom" wide />}
      </div>
      <div style={{ fontSize: '16px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
      {hint && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>{hint}</div>}
    </div>
  )
}

function SummaryItem({ label, value, color, hint, tooltip }: { label: string; value: string; color?: string; hint?: string; tooltip?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        {tooltip && <Tooltip text={tooltip} position="bottom" wide />}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: color ?? 'var(--text)', fontFamily: "'Courier New', monospace" }}>{value}</div>
      {hint && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{hint}</div>}
    </div>
  )
}
