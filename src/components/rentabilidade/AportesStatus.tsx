'use client'
import { PieChart, Pie, Cell } from 'recharts'

const fmt0 = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

interface Props {
  profitableCount: number
  totalCount:      number
  currentBtcPrice: number
}

export default function AportesStatus({ profitableCount, totalCount, currentBtcPrice }: Props) {
  const lossCount  = totalCount - profitableCount
  const profitPct  = totalCount > 0 ? (profitableCount / totalCount * 100).toFixed(1) : '0'
  const lossPct    = totalCount > 0 ? (lossCount / totalCount * 100).toFixed(1) : '0'

  const data = [
    { value: profitableCount },
    { value: lossCount       },
  ]

  return (
    <div style={{
      background:   'rgba(255,255,255,0.015)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding:      '20px 22px',
      display:      'flex',
      flexDirection: 'column',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '18px' }}>
        Aportes em lucro / prejuízo
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
        {/* Donut */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <PieChart width={130} height={130}>
            <Pie
              data={data}
              cx={65}
              cy={65}
              innerRadius={44}
              outerRadius={60}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              strokeWidth={0}
            >
              <Cell fill="#22c55e" />
              <Cell fill="#ef4444" />
            </Pie>
          </PieChart>
          <div style={{
            position:   'absolute', inset: 0,
            display:    'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
              {totalCount}
            </div>
            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              aportes
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#22c55e' }}>{profitableCount}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>em lucro</span>
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', paddingLeft: '17px' }}>
              {profitPct}%
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444' }}>{lossCount}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>em prejuízo</span>
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', paddingLeft: '17px' }}>
              {lossPct}%
            </div>
          </div>
        </div>
      </div>

      <div style={{
        marginTop:  '16px',
        paddingTop: '12px',
        borderTop:  '1px solid rgba(255,255,255,0.05)',
        fontSize:   '9px',
        color:      'rgba(255,255,255,0.3)',
        lineHeight: 1.5,
      }}>
        Lucro/Prejuízo calculado sobre o preço atual do BTC ({fmt0(currentBtcPrice)}).
      </div>
    </div>
  )
}
