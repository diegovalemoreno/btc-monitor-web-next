'use client'
import React from 'react'
import type { PatrimonioData } from '@lib/rentabilidade/types'
import Tooltip from '@/components/shared/Tooltip'

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

function Sparkline({ history, color }: { history: { date: string; price: number }[]; color: string }) {
  const recent = history.slice(-60)
  if (recent.length < 2) return null
  const min = Math.min(...recent.map(p => p.price))
  const max = Math.max(...recent.map(p => p.price))
  const range = max - min || 1
  const w = 130
  const h = 36
  const pts = recent.map((p, i) => {
    const x = (i / (recent.length - 1)) * w
    const y = h - ((p.price - min) / range) * (h - 6) - 3
    return `${x},${y}`
  }).join(' ')
  const lastY = h - ((recent[recent.length - 1].price - min) / range) * (h - 6) - 3
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: w, height: h, display: 'block' }}>
      <defs>
        <linearGradient id="spark-hero-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#spark-hero-g)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={lastY} r={3} fill={color} />
    </svg>
  )
}

function KpiCol({
  label, value, valueColor, icon, borderLeft, tooltip,
}: {
  label: React.ReactNode; value: string; valueColor?: string; icon: string; borderLeft?: boolean; tooltip?: string
}) {
  return (
    <div style={{
      paddingLeft: borderLeft ? '20px' : 0,
      borderLeft:  borderLeft ? '1px solid rgba(255,255,255,0.07)' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <div style={{
          width: '22px', height: '22px', borderRadius: '50%',
          background: 'var(--bg)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px', color: 'var(--text-sec)', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ fontSize: '7.5px', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: 1.2 }}>
          {label}
        </div>
        {tooltip && <Tooltip text={tooltip} position="bottom" wide />}
      </div>
      <div style={{ fontSize: '15px', fontWeight: 800, color: valueColor ?? 'var(--text)', paddingLeft: '30px' }}>
        {value}
      </div>
    </div>
  )
}

interface Props { patrimonio: PatrimonioData }

export default function PatrimonioHero({ patrimonio }: Props) {
  const {
    currentValue, totalInvested, totalReturn, totalReturnBrl,
    avgPrice, totalBtc, contributionCount, currentBtcPrice, priceHistory,
  } = patrimonio

  const isUp        = totalReturn >= 0
  const returnColor = isUp ? '#4ade80' : '#f87171'
  const arrow       = isUp ? '▲' : '▼'

  return (
    <div style={{
      background:   'linear-gradient(135deg, #0d1a27 0%, #0f2236 60%, #0b1820 100%)',
      border:       '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding:      '24px 28px 20px',
      position:     'relative',
      overflow:     'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: '30%',
        width: '40%', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.3), transparent)',
      }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '28px', alignItems: 'center' }}>

        {/* Left: value + return + sparkline */}
        <div>
          <div style={{
            fontSize: '8px', color: 'var(--text-sec)', textTransform: 'uppercase',
            letterSpacing: '2px', marginBottom: '8px',
          }}>
            Patrimônio atual
          </div>
          <div style={{
            fontSize: '36px', fontWeight: 900, color: 'var(--text)',
            letterSpacing: '-1.5px', lineHeight: 1, marginBottom: '8px',
          }}>
            {fmt0(currentValue)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{
              fontSize: '13px', fontWeight: 700, color: returnColor,
              background: isUp ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${isUp ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
              borderRadius: '5px', padding: '1px 7px',
            }}>
              {arrow} {Math.abs(totalReturn).toFixed(1).replace('.', ',')}%
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-sec)' }}>
              {totalReturn >= 0 ? '+' : ''}{fmt0(totalReturnBrl)} total
            </span>
          </div>
          <Sparkline history={priceHistory} color={returnColor} />
        </div>

        {/* Right: KPI columns */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          paddingLeft: '28px',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
        }}>
          <KpiCol
            icon="$"
            label={<>Preço médio<br />(DCA)</>}
            value={fmt0(avgPrice)}
            valueColor="#f59e0b"
            tooltip={'Preço médio ponderado de aquisição do Bitcoin.\n\nCálculo: Total investido ÷ Total de BTC comprado.\n\nQuanto menor em relação ao preço atual, maior o lucro não realizado.'}
          />
          <KpiCol icon="₿" label="BTC acumulado"   value={totalBtc.toFixed(8) + ' BTC'} borderLeft
            tooltip={'Total de Bitcoin acumulado em todos os aportes.\n\n1 BTC = 100.000.000 satoshis.\n\nAportes sem BTC registrado não são incluídos.'}
          />
          <KpiCol icon="▤"  label="Total investido" value={fmt0(totalInvested)}           borderLeft
            tooltip={'Soma de todos os valores aportados em reais.\n\nInclui apenas aportes com BTC registrado. Vendas são excluídas.'}
          />
          <KpiCol icon="✦" label="Total de aportes" value={String(contributionCount)}     borderLeft
            tooltip={'Número total de lançamentos registrados.\n\nInclui todos os tipos: Tático, DCA Estrutural e Manual.'}
          />
        </div>
      </div>
    </div>
  )
}
