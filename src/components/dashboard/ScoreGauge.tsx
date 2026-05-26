// src/components/dashboard/ScoreGauge.tsx
interface ScoreGaugeProps {
  value: number   // 0–100
  size?: number
}

export default function ScoreGauge({ value, size = 88 }: ScoreGaugeProps) {
  const r      = (size / 2) - 9
  const circ   = 2 * Math.PI * r
  const pct    = Math.min(100, Math.max(0, value))
  const dash   = (pct / 100) * circ
  const color  = pct > 60 ? '#00C853' : pct > 40 ? '#e08a3a' : '#FF1744'
  const cx     = size / 2
  const cy     = size / 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="var(--surface3)" strokeWidth="7"
        />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text
          x={cx} y={cy + 5}
          textAnchor="middle"
          fill={color}
          fontSize="15"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {Math.round(pct)}
        </text>
      </svg>
      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Oportunidade
      </span>
    </div>
  )
}
