'use client'
import { useState, useMemo } from 'react'
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { EvolutionPoint } from '@lib/rentabilidade/types'

type Period = '1M' | '6M' | 'YTD' | '1A' | 'Todos'
const PERIODS: Period[] = ['1M', '6M', 'YTD', '1A', 'Todos']

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const fmtK = (n: number) => {
  if (n >= 1_000_000) return `R$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `R$${Math.round(n / 1_000)}k`
  return `R$${Math.round(n)}`
}

const fmtDate = (ts: number) => {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function filterByPeriod(data: EvolutionPoint[], period: Period): EvolutionPoint[] {
  if (period === 'Todos') return data
  const now = Date.now()
  const cutoff =
    period === '1M'  ? now - 30  * 86_400_000 :
    period === '6M'  ? now - 180 * 86_400_000 :
    period === '1A'  ? now - 365 * 86_400_000 :
    new Date(new Date().getFullYear(), 0, 1).getTime()
  return data.filter(p => p.ts >= cutoff)
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: number
}) {
  if (!active || !payload?.length || !label) return null
  const patrimonio = payload.find(p => p.name === 'patrimonio')
  const btcPrice   = payload.find(p => p.name === 'btcPrice')
  const aporte     = payload.find(p => p.name === 'aporte' && p.value > 0)
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '8px', padding: '10px 14px', fontSize: '11px', lineHeight: 1.8,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    }}>
      <div style={{ color: 'var(--text-sec)', marginBottom: '4px', fontSize: '10px' }}>
        {new Date(label).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      </div>
      {patrimonio && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span style={{ color: 'var(--text)' }}>Patrimônio</span>
          <span style={{ fontWeight: 700, color: '#22c55e', marginLeft: 'auto' }}>{fmt0(patrimonio.value)}</span>
        </div>
      )}
      {btcPrice && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
          <span style={{ color: 'var(--text)' }}>Preço BTC</span>
          <span style={{ fontWeight: 700, color: '#f59e0b', marginLeft: 'auto' }}>{fmt0(btcPrice.value)}</span>
        </div>
      )}
      {aporte && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '2px', background: 'rgba(148,163,184,0.6)', display: 'inline-block' }} />
          <span style={{ color: 'var(--text)' }}>Aporte</span>
          <span style={{ fontWeight: 700, color: 'var(--text)', marginLeft: 'auto' }}>{fmt0(aporte.value)}</span>
        </div>
      )}
    </div>
  )
}

interface Props { evolution: EvolutionPoint[] }

export default function PatrimonioChart({ evolution }: Props) {
  const [period, setPeriod] = useState<Period>('Todos')
  const filtered = useMemo(() => filterByPeriod(evolution, period), [evolution, period])

  if (!filtered.length) return null

  const minTs = filtered[0].ts
  const maxTs = filtered[filtered.length - 1].ts

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderRadius: '12px',
      padding:      '20px 22px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
            Evolução do patrimônio
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: 'var(--text-sec)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              Patrimônio (R$)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              Preço do BTC (R$)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: 10, height: 8, borderRadius: '2px', background: 'rgba(148,163,184,0.5)', display: 'inline-block' }} />
              Aportes (R$)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding:      '4px 10px',
                borderRadius: '6px',
                fontSize:     '11px',
                fontWeight:   600,
                cursor:       'pointer',
                border:       period === p ? '1px solid var(--border-strong)' : '1px solid transparent',
                background:   period === p ? 'var(--surface3)' : 'transparent',
                color:        period === p ? 'var(--text)' : 'var(--text-muted)',
                transition:   'all 0.15s',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={filtered} margin={{ top: 5, right: 55, left: 5, bottom: 0 }}>
          <defs>
            <linearGradient id="patrimonio-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" vertical={false} />

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={[minTs, maxTs]}
            tickFormatter={fmtDate}
            tickCount={7}
            stroke="var(--border-dim)"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={fmtK}
            stroke="var(--border-dim)"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            width={52}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={fmtK}
            stroke="var(--border-dim)"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            width={58}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
          />

          <Bar
            yAxisId="left"
            dataKey="aporte"
            fill="rgba(148,163,184,0.35)"
            maxBarSize={5}
            isAnimationActive={false}
          />

          <Area
            yAxisId="left"
            dataKey="patrimonio"
            type="monotone"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#patrimonio-grad)"
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e', strokeWidth: 0 }}
            isAnimationActive={false}
          />

          <Line
            yAxisId="right"
            dataKey="btcPrice"
            type="monotone"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
