'use client'
import {
  ComposedChart, Area, Scatter, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { colorForReturn } from '@lib/rentabilidade/compute'
import type { PatrimonioData } from '@lib/rentabilidade/types'

const fmtBrl = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const fmtDate = (ts: number) => {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

type ScatterPoint = {
  ts: number
  y: number           // Y position = price from history (same source as area chart)
  btcPriceBrl: number // actual price paid, for tooltip
  returnPct: number
  amountBrl: number
  btcAmount: number
}

function CustomDot(props: { cx?: number; cy?: number; payload?: ScatterPoint }) {
  const { cx = 0, cy = 0, payload } = props
  const color = colorForReturn(payload?.returnPct ?? 0)
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={color} stroke="#0d1117" strokeWidth={1.5} opacity={0.92} />
    </g>
  )
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint | { ts: number; price: number } }> }) {
  if (!active || !payload?.length) return null
  const scatterPayload = payload.find(p => 'returnPct' in p.payload)
  const d = scatterPayload?.payload as ScatterPoint | undefined
  if (!d) return null
  const color = colorForReturn(d.returnPct)
  return (
    <div style={{
      background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '6px', padding: '8px 12px', fontSize: '11px', lineHeight: 1.6,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2px' }}>{new Date(d.ts).toLocaleDateString('pt-BR')}</div>
      <div style={{ color, fontWeight: 700 }}>
        {d.returnPct >= 0 ? '+' : ''}{d.returnPct.toFixed(1).replace('.', ',')}%
      </div>
      <div style={{ color: 'rgba(255,255,255,0.6)' }}>{fmtBrl(d.btcPriceBrl)} (preço pago)</div>
      <div style={{ color: 'rgba(255,255,255,0.6)' }}>{fmtBrl(d.amountBrl)} · {d.btcAmount.toFixed(6)} BTC</div>
    </div>
  )
}

function buildAreaData(history: PatrimonioData['priceHistory']) {
  return history.map(p => ({ ts: new Date(p.date).getTime(), price: p.price }))
}

function buildScatterData(
  contributions: PatrimonioData['contributions'],
  priceByDate: Map<string, number>,
): ScatterPoint[] {
  return contributions.map(c => ({
    ts:          new Date(c.date).getTime(),
    y:           priceByDate.get(c.date) ?? c.btcPriceBrl,
    btcPriceBrl: c.btcPriceBrl,
    returnPct:   c.returnPct,
    amountBrl:   c.amountBrl,
    btcAmount:   c.btcAmount,
  }))
}

interface Props { patrimonio: PatrimonioData }

export default function BtcChart({ patrimonio }: Props) {
  const { priceHistory, contributions, avgPrice } = patrimonio
  const areaData    = buildAreaData(priceHistory)
  const priceByDate = new Map(priceHistory.map(p => [p.date, p.price]))
  const scatterData = buildScatterData(contributions, priceByDate)

  if (!areaData.length) return null

  const minTs = areaData[0]?.ts ?? 0
  const maxTs = areaData[areaData.length - 1]?.ts ?? Date.now()

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px', padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Histórico BTC + Seus Aportes
        </div>
        <div style={{ display: 'flex', gap: '14px', fontSize: '8px' }}>
          <span style={{ color: '#fbbf24' }}>— Preço BTC</span>
          <span style={{ color: '#4ade80' }}>● Em lucro</span>
          <span style={{ color: '#ef4444' }}>● Em prejuízo</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="btc-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#fbbf24" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={[minTs, maxTs]}
            tickFormatter={fmtDate}
            tickCount={7}
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
          />
          <YAxis
            tickFormatter={n => `R$${Math.round(n / 1000)}k`}
            stroke="rgba(255,255,255,0.1)"
            tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
            width={60}
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            y={avgPrice}
            stroke="rgba(251,191,36,0.35)"
            strokeDasharray="4 4"
            label={{ value: 'Preço médio', fill: 'rgba(251,191,36,0.55)', fontSize: 9, position: 'insideTopLeft' }}
          />

          <Area
            data={areaData}
            dataKey="price"
            type="monotone"
            stroke="#fbbf24"
            strokeWidth={1.5}
            fill="url(#btc-area-grad)"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />

          <Scatter
            data={scatterData}
            dataKey="y"
            shape={<CustomDot />}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
