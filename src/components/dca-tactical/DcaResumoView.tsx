'use client'

import { useState, useEffect, useMemo } from 'react'
import type { DcaContributionRow } from '@/lib/db/types'
import DcaPatrimonyChart from './DcaPatrimonyChart'
import Tooltip from '@/components/shared/Tooltip'

type ChartPeriod = 'all' | '12m' | '2y' | '5y' | '10y'

const CHART_PERIODS: { id: ChartPeriod; label: string }[] = [
  { id: 'all',  label: 'Desde o início' },
  { id: '12m',  label: '12 meses'       },
  { id: '2y',   label: '2 anos'         },
  { id: '5y',   label: '5 anos'         },
  { id: '10y',  label: '10 anos'        },
]

function filterByPeriod(contributions: DcaContributionRow[], period: ChartPeriod): DcaContributionRow[] {
  if (period === 'all') return contributions
  const now  = new Date()
  const months: Record<ChartPeriod, number> = { all: 0, '12m': 12, '2y': 24, '5y': 60, '10y': 120 }
  const from = new Date(now.getFullYear(), now.getMonth() - months[period] + 1, 1)
  return contributions.filter(c => new Date(c.contribution_date + 'T00:00:00') >= from)
}

const fmt     = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
const fmtBRL0 = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)
const fmtBTC  = (sats: number) => {
  const btc = sats / 1e8
  const str = btc.toFixed(8).replace(/\.?0+$/, '')
  return str + ' BTC'
}

function extractFee(notes: string | null): number | null {
  if (!notes) return null
  const m = notes.match(/taxa R\$(\d+(?:[.,]\d+)?)/)
  if (!m) return null
  return parseFloat(m[1].replace(',', '.'))
}

interface Props { initialContributions: DcaContributionRow[] }

export default function DcaResumoView({ initialContributions }: Props) {
  const [btcPriceBrl,  setBtcPriceBrl]  = useState<number | null>(null)
  const [chartPeriod,  setChartPeriod]  = useState<ChartPeriod>('all')

  useEffect(() => {
    fetch('/api/btc-price-brl')
      .then(r => r.ok ? r.json() : null)
      .then((d: { btcPriceBrl?: number } | null) => { if (d?.btcPriceBrl) setBtcPriceBrl(d.btcPriceBrl) })
      .catch(() => {})
  }, [])

  const contributions = initialContributions
  const now           = new Date()

  const withSats        = contributions.filter(c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
  const totalSats       = contributions.filter(c => !c.notes?.includes('Venda')).reduce((s, c) => s + (c.sats_purchased ?? 0), 0)
  const totalAmount     = contributions.reduce((s, c) => s + c.amount, 0)
  const avgPriceBrl     = withSats.length > 0
    ? (withSats.reduce((s, c) => s + c.amount, 0) / withSats.reduce((s, c) => s + (c.sats_purchased ?? 0), 0)) * 1e8
    : null
  const totalInvested   = withSats.reduce((s, c) => s + c.amount, 0)
  const currentBtcValue = btcPriceBrl !== null ? (totalSats / 1e8) * btcPriceBrl : null
  const rentabilidade   = currentBtcValue !== null && totalInvested > 0 ? ((currentBtcValue - totalInvested) / totalInvested) * 100 : null
  const priceDiffAbs    = btcPriceBrl !== null && avgPriceBrl !== null ? btcPriceBrl - avgPriceBrl : null
  const priceDiffPct    = priceDiffAbs !== null && avgPriceBrl !== null ? (priceDiffAbs / avgPriceBrl) * 100 : null

  const last12 = useMemo(() => {
    const from12 = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const data   = contributions.filter(c => new Date(c.contribution_date + 'T00:00:00') >= from12)
    const purchases = data.filter(c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
    const fk     = purchases.filter(c => extractFee(c.notes) !== null)
    const fees   = fk.reduce((s, c) => s + (extractFee(c.notes) ?? 0), 0)
    const spread = purchases.filter(c => c.effective_price_brl && c.btc_price_brl)
      .reduce((s, c) => s + (c.effective_price_brl! - c.btc_price_brl!) * (c.sats_purchased! / 1e8), 0)
    return { feesKnown: fk, totalFees: fees, totalSpread: spread, totalImpact: fees + Math.max(0, spread - fees) }
  }, [contributions]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '36px' }}>

        <KPICard
          accent="var(--orange)"
          label="Total investido"
          value={fmt(totalAmount)}
          valueColor="var(--orange)"
          sub1={`${contributions.length} aportes registrados`}
          sub2={withSats.length > 0 ? `${withSats.length} com BTC registrado` : undefined}
          tooltip="Soma de todos os valores aportados em reais ao longo de todo o histórico. Inclui todos os tipos de aporte."
        />

        <KPICard
          accent="#F7931A"
          label="Bitcoin acumulado"
          value={totalSats > 0 ? fmtBTC(totalSats) : '—'}
          valueColor="#F7931A"
          sub1={avgPriceBrl !== null ? `PM: ${fmtBRL0(avgPriceBrl)}/BTC` : undefined}
          sub1Color="#22C55E"
          tooltip={"Total de Bitcoin acumulado em compras, expresso em BTC.\n\nPM = Preço médio ponderado de aquisição.\n\n1 BTC = 100.000.000 satoshis. Vendas são excluídas."}
        />

        <KPICard
          accent={rentabilidade !== null ? (rentabilidade >= 0 ? '#22C55E' : '#EF4444') : '#22C55E'}
          label="Valor atual do portfólio"
          value={currentBtcValue !== null ? fmt(currentBtcValue) : '—'}
          valueColor={rentabilidade !== null ? (rentabilidade >= 0 ? '#22C55E' : '#EF4444') : 'var(--text)'}
          sub1={rentabilidade !== null ? `Rentabilidade: ${rentabilidade >= 0 ? '+' : ''}${rentabilidade.toFixed(2).replace('.', ',')}%` : 'Carregando cotação…'}
          sub1Color={rentabilidade !== null ? (rentabilidade >= 0 ? '#22C55E' : '#EF4444') : 'var(--text-muted)'}
          tooltip={"Valor atual do seu portfólio de Bitcoin ao preço de mercado.\n\nCálculo: Total de BTC × Preço atual do BTC em R$\n\nA rentabilidade mostra o retorno não realizado sobre o total investido."}
        />

        <KPICard
          accent={priceDiffPct !== null ? (priceDiffPct >= 0 ? '#22C55E' : '#EF4444') : '#6366F1'}
          label="Variação vs. Preço Médio"
          value={priceDiffPct !== null ? `${priceDiffPct >= 0 ? '+' : ''}${priceDiffPct.toFixed(2).replace('.', ',')}%` : '—'}
          valueColor={priceDiffPct !== null ? (priceDiffPct >= 0 ? '#22C55E' : '#EF4444') : 'var(--text)'}
          sub1={btcPriceBrl !== null ? `BTC atual: ${fmtBRL0(btcPriceBrl)}/BTC` : 'Carregando…'}
          sub2={priceDiffAbs !== null ? `Diferença: ${priceDiffAbs >= 0 ? '+' : ''}${fmtBRL0(priceDiffAbs)}/BTC` : undefined}
          tooltip={"Diferença percentual entre o preço atual do BTC e seu preço médio de aquisição.\n\n✅ Positivo: BTC acima do custo médio — portfólio no lucro.\n🔴 Negativo: BTC abaixo do custo médio — portfólio no prejuízo.\n\nFonte do preço: CoinGecko (atualizado a cada 2 min)."}
        />

      </div>

      {/* Cost analysis — last 12 months */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Análise de custos</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Últimos 12 meses</span>
        </div>

        {last12.feesKnown.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <CostCard accent="#F59E0B" label="Taxas pagas"      value={fmt(last12.totalFees)} valueColor="#F59E0B" hint={`${last12.feesKnown.length} aportes com taxa`} tooltip={'Soma das taxas explícitas pagas à plataforma nos últimos 12 meses.'} />
            <CostCard accent="#F97316" label="Spread acumulado" value={fmt(Math.max(0, last12.totalSpread - last12.totalFees))} valueColor="#F97316" hint="Custo oculto embutido no preço" tooltip={"Diferença entre cotação de referência e preço efetivo pago, excluindo taxas."} />
            <CostCard accent="#EF4444" label="Impacto total"    value={fmt(last12.totalImpact)} valueColor="#EF4444" hint="Taxas + spread" tooltip={"Custo total pago acima do preço de mercado."} />
            <CostCard accent="var(--text-muted)" label="Aportes analisados" value={String(last12.feesKnown.length)} hint="Com dados de custo" tooltip={"Aportes com taxa registrada nos últimos 12 meses."} />
          </div>
        ) : (
          <div style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Nenhum aporte com dados de taxa nos últimos 12 meses. Registre os custos nos aportes para análise.
          </div>
        )}
      </div>

      {/* Patrimony evolution chart */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Evolução de Patrimônio</div>
          {/* Period filter pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CHART_PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setChartPeriod(p.id)}
                style={{
                  padding:      '5px 12px',
                  background:   chartPeriod === p.id ? 'var(--orange-dim)' : 'var(--surface)',
                  border:       `1px solid ${chartPeriod === p.id ? 'var(--orange)' : 'var(--border)'}`,
                  borderRadius: '20px',
                  color:        chartPeriod === p.id ? 'var(--orange)' : 'var(--text-muted)',
                  fontSize:     '12px',
                  fontWeight:   chartPeriod === p.id ? 600 : 400,
                  cursor:       'pointer',
                  whiteSpace:   'nowrap',
                  transition:   'all 0.12s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <DcaPatrimonyChart contributions={filterByPeriod(contributions, chartPeriod)} />
      </div>

    </div>
  )
}

function KPICard({ accent, label, value, valueColor, sub1, sub1Color, sub2, tooltip }: {
  accent: string; label: string; value: string; valueColor?: string
  sub1?: string; sub1Color?: string; sub2?: string; tooltip?: string
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: '12px', padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>{label}</span>
        {tooltip && <Tooltip text={tooltip} position="bottom" wide />}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: valueColor ?? 'var(--text)', fontFamily: "'Courier New', monospace", marginBottom: sub1 ? '6px' : '0', lineHeight: 1.2 }}>{value}</div>
      {sub1 && <div style={{ fontSize: '12px', color: sub1Color ?? 'var(--text-muted)', marginTop: '4px' }}>{sub1}</div>}
      {sub2 && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub2}</div>}
    </div>
  )
}

function CostCard({ accent, label, value, valueColor, hint, tooltip }: {
  accent: string; label: string; value: string; valueColor?: string; hint?: string; tooltip?: string
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${accent}`, borderRadius: '12px', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        {tooltip && <Tooltip text={tooltip} position="bottom" wide />}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: valueColor ?? 'var(--text)', fontFamily: "'Courier New', monospace", marginBottom: hint ? '4px' : '0' }}>{value}</div>
      {hint && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{hint}</div>}
    </div>
  )
}
