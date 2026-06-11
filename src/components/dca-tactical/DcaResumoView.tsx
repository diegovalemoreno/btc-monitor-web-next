'use client'

import { useState, useEffect, useMemo } from 'react'
import type { DcaContributionRow } from '@/lib/db/types'
import DcaPatrimonyChart from './DcaPatrimonyChart'
import Tooltip from '@/components/shared/Tooltip'


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
  const [btcPriceBrl, setBtcPriceBrl] = useState<number | null>(null)

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
    const from12    = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const data      = contributions.filter(c => new Date(c.contribution_date + 'T00:00:00') >= from12)
    const purchases = data.filter(c => c.sats_purchased && c.sats_purchased > 0 && !c.notes?.includes('Venda'))
    const fk        = purchases.filter(c => extractFee(c.notes) !== null)
    const fees      = fk.reduce((s, c) => s + (extractFee(c.notes) ?? 0), 0)
    const spread    = purchases.filter(c => c.effective_price_brl && c.btc_price_brl)
      .reduce((s, c) => s + (c.effective_price_brl! - c.btc_price_brl!) * (c.sats_purchased! / 1e8), 0)
    return { feesKnown: fk, totalFees: fees, totalSpread: spread, totalImpact: fees + Math.max(0, spread - fees) }
  }, [contributions]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
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
      <div>
        <SectionHeader label="Análise de Custos" sub="Últimos 12 meses" />
        {last12.feesKnown.length > 0 ? (
          <div style={{
            background:   'var(--surface)',
            border:       '1px solid var(--border)',
            borderRadius: '12px',
            overflow:     'hidden',
          }}>
            <CostRow
              accent="#F59E0B" label="Taxas pagas"
              value={fmt(last12.totalFees)} valueColor="#F59E0B"
              hint={`${last12.feesKnown.length} aportes com taxa`}
              tooltip="Soma das taxas explícitas pagas à plataforma nos últimos 12 meses."
            />
            <CostRow
              accent="#F97316" label="Spread acumulado"
              value={fmt(Math.max(0, last12.totalSpread - last12.totalFees))} valueColor="#F97316"
              hint="Custo oculto embutido no preço"
              tooltip="Diferença entre cotação de referência e preço efetivo pago, excluindo taxas."
            />
            <CostRow
              accent="#EF4444" label="Impacto total"
              value={fmt(last12.totalImpact)} valueColor="#EF4444"
              hint="Taxas + spread"
              tooltip="Custo total pago acima do preço de mercado."
              isTotal
            />
            <CostRow
              accent="var(--border-strong)" label="Aportes analisados"
              value={String(last12.feesKnown.length)}
              hint="Com dados de custo"
              tooltip="Aportes com taxa registrada nos últimos 12 meses."
            />
          </div>
        ) : (
          <div style={{ padding: '28px 24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
            Nenhum aporte com dados de taxa nos últimos 12 meses.<br />
            Registre os custos nos aportes para análise.
          </div>
        )}
      </div>

      {/* Patrimony evolution chart */}
      <div>
        <DcaPatrimonyChart contributions={contributions} />
      </div>

    </div>
  )
}

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
      <span style={{
        fontSize:      '11px',
        fontWeight:    700,
        color:         'var(--text)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        whiteSpace:    'nowrap',
      }}>
        {label}
      </span>
      {sub && (
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {sub}
        </span>
      )}
      <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
    </div>
  )
}

function KPICard({ accent, label, value, valueColor, sub1, sub1Color, sub2, tooltip }: {
  accent: string; label: string; value: string; valueColor?: string
  sub1?: string; sub1Color?: string; sub2?: string; tooltip?: string
}) {
  return (
    <div style={{
      position:            'relative',
      background:          'var(--surface)',
      border:              '1px solid var(--border)',
      borderTop:           `2px solid ${accent}`,
      borderRadius:        '12px',
      padding:             '20px 22px',
      overflow:            'hidden',
      animationName:       'fadeIn',
      animationDuration:   '0.4s',
      animationFillMode:   'both',
    }}>
      <div style={{
        position:      'absolute',
        top:            0,
        right:          0,
        width:          '90px',
        height:         '90px',
        background:     `radial-gradient(circle at top right, ${accent}18 0%, transparent 70%)`,
        pointerEvents:  'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.11em' }}>
          {label}
        </span>
        {tooltip && <Tooltip text={tooltip} position="bottom" wide />}
      </div>
      <div style={{
        fontSize:           '24px',
        fontWeight:         800,
        color:              valueColor ?? 'var(--text)',
        letterSpacing:      '-0.5px',
        fontVariantNumeric: 'tabular-nums',
        lineHeight:         1.1,
        marginBottom:       sub1 ? '8px' : 0,
      }}>
        {value}
      </div>
      {sub1 && (
        <div style={{ fontSize: '12px', color: sub1Color ?? 'var(--text-muted)', marginTop: '6px' }}>
          {sub1}
        </div>
      )}
      {sub2 && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
          {sub2}
        </div>
      )}
    </div>
  )
}

function CostRow({ accent, label, value, valueColor, hint, tooltip, isTotal }: {
  accent: string; label: string; value: string; valueColor?: string
  hint?: string; tooltip?: string; isTotal?: boolean
}) {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          '16px',
      padding:      '14px 20px',
      borderBottom: '1px solid var(--border-dim)',
      background:   isTotal ? 'var(--orange-subtle)' : 'transparent',
    }}>
      <div style={{
        width:        '3px',
        height:       '22px',
        borderRadius: '2px',
        background:   accent,
        flexShrink:   0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize:   '12px',
            fontWeight: isTotal ? 700 : 500,
            color:      isTotal ? 'var(--text)' : 'var(--text-sec)',
          }}>
            {label}
          </span>
          {tooltip && <Tooltip text={tooltip} position="bottom" wide />}
        </div>
        {hint && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {hint}
          </div>
        )}
      </div>
      <div style={{
        fontSize:           isTotal ? '18px' : '15px',
        fontWeight:         isTotal ? 800 : 600,
        color:              valueColor ?? 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing:      '-0.3px',
        flexShrink:         0,
      }}>
        {value}
      </div>
    </div>
  )
}
