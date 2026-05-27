'use client'
import { useId } from 'react'
import type { IndicatorGroupKey, IndicatorScore } from '@lib/shared/types/signal'

interface DimensionVisualProps {
  groupKey:   IndicatorGroupKey
  score:      number
  indicators: IndicatorScore[]
}

function normalizeToPct(score: number): number {
  return Math.min(100, Math.max(0, (score + 10) / 20 * 100))
}

function TrendMeter({ score }: { score: number }) {
  const pct     = normalizeToPct(score)
  const markerX = pct * 1.8 + 10
  const zoneColor = score > 4 ? '#00C853' : score > 0 ? '#4CAF50' : score === 0 ? '#607D8B' : score > -4 ? '#FF9800' : '#FF3D00'

  const zones = [
    { label: 'Bear Forte', color: '#FF3D00' },
    { label: 'Fraco',      color: '#FF9800' },
    { label: 'Neutro',     color: '#607D8B' },
    { label: 'Forte',      color: '#4CAF50' },
    { label: 'Bull',       color: '#00C853' },
  ]

  return (
    <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none">
      {zones.map((z, i) => (
        <rect key={z.label} x={10 + i * 36} y={16} width={36} height={12} fill={z.color} opacity={0.2} />
      ))}
      {zones.map((z, i) => (
        <text key={`lbl-${z.label}`} x={10 + i * 36 + 18} y={40} textAnchor="middle" fontSize="6.5" fill={z.color} opacity={0.75}>
          {z.label}
        </text>
      ))}
      <rect x={10} y={16} width={180} height={12} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} rx={2} />
      <text x={markerX} y={12} textAnchor="middle" fontSize="9" fill={zoneColor} fontWeight="800">
        {score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)}
      </text>
      <polygon
        points={`${markerX},16 ${markerX + 4},22 ${markerX},28 ${markerX - 4},22`}
        fill={zoneColor}
      />
    </svg>
  )
}

function SentimentSpectrum({ score }: { score: number }) {
  const uid     = useId()
  const gradId  = `sent-grad-${uid}`
  const pct     = normalizeToPct(score)
  const needleX = 10 + (pct / 100) * 180
  const color   = score > 2 ? '#00C853' : score < -2 ? '#1565C0' : '#607D8B'

  return (
    <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%"   stopColor="#1565C0" stopOpacity={0.5} />
          <stop offset="40%"  stopColor="#455A64" stopOpacity={0.3} />
          <stop offset="60%"  stopColor="#455A64" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#E53935" stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <rect x={10} y={20} width={180} height={10} fill={`url(#${gradId})`} rx={5} />
      <rect x={10} y={20} width={180} height={10} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} rx={5} />
      <text x={10}  y={40} textAnchor="start"  fontSize="7" fill="#1565C0" opacity={0.8}>Medo extremo</text>
      <text x={100} y={40} textAnchor="middle" fontSize="7" fill="var(--text-muted)">Neutro</text>
      <text x={190} y={40} textAnchor="end"    fontSize="7" fill="#E53935" opacity={0.8}>Euforia</text>
      <line x1={needleX} y1={16} x2={needleX} y2={34} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={needleX} cy={25} r={4.5} fill={color} />
      <text x={needleX} y={12} textAnchor="middle" fontSize="9" fill={color} fontWeight="800">
        {score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)}
      </text>
    </svg>
  )
}

function LeveragePressure({ indicators }: { indicators: IndicatorScore[] }) {
  const items = [
    { label: 'Funding',     name: 'Taxa de Funding' },
    { label: 'Open Int.',   name: 'Open Interest'   },
    { label: 'Liquidações', name: 'Liq. de Longs'   },
  ].map(({ label, name }) => {
    const ind = indicators.find(i => i.name === name)
    return { label, score: ind?.score ?? 0 }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
      {items.map(item => {
        const pct   = Math.min(100, Math.max(0, (item.score + 2) / 4 * 100))
        const color = item.score > 0 ? '#00C853' : item.score < 0 ? '#FF6D00' : '#607D8B'
        return (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', width: '64px', flexShrink: 0 }}>
              {item.label}
            </span>
            <div style={{ flex: 1, height: '7px', background: 'var(--surface3)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: '9px', color, fontWeight: 700, width: '28px', textAlign: 'right', flexShrink: 0 }}>
              {item.score > 0 ? `+${item.score.toFixed(1)}` : item.score.toFixed(1)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CycleArc({ score }: { score: number }) {
  const pct      = normalizeToPct(score)
  const cx       = 100
  const cy       = 52
  const r        = 40
  const angle    = Math.PI - (pct / 100) * Math.PI
  const dotX     = cx + r * Math.cos(angle)
  const dotY     = cy - r * Math.sin(angle)
  const largeArc = pct > 50 ? 1 : 0
  const color    = score > 4 ? '#00C853' : score > 0 ? '#4CAF50' : score < -4 ? '#FF3D00' : score < 0 ? '#FF9800' : '#607D8B'

  const labels = [
    { x: 14,  y: 52, text: 'Capitulação', color: '#FF3D00' },
    { x: 42,  y: 16, text: 'Acumulação',  color: '#FF9800' },
    { x: 100, y: 4,  text: 'Crescimento', color: '#607D8B' },
    { x: 158, y: 16, text: 'Euforia',     color: '#F57F17' },
    { x: 186, y: 52, text: 'Topo',        color: '#E53935' },
  ]

  return (
    <svg width="100%" height="60" viewBox="0 0 200 60" preserveAspectRatio="xMidYMid meet">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="var(--surface3)" strokeWidth={7} strokeLinecap="round" />
      {pct > 0 && pct < 100 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${dotX} ${dotY}`}
          fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
      )}
      {pct >= 100 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" />
      )}
      <circle cx={dotX} cy={dotY} r={6} fill={color} />
      <circle cx={dotX} cy={dotY} r={3} fill="var(--surface)" />
      {labels.map(l => (
        <text key={l.text} x={l.x} y={l.y} textAnchor="middle" fontSize="6" fill={l.color} opacity={0.7}>
          {l.text}
        </text>
      ))}
    </svg>
  )
}

function MacroCompass({ score }: { score: number }) {
  const uid     = useId()
  const gradId  = `macro-grad-${uid}`
  const pct     = normalizeToPct(score)
  const needleX = 10 + (pct / 100) * 180
  const color   = score > 0 ? '#00C853' : score < 0 ? '#FF6D00' : '#607D8B'

  return (
    <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%"   stopColor="#FF3D00" stopOpacity={0.4} />
          <stop offset="50%"  stopColor="#455A64" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#00C853" stopOpacity={0.4} />
        </linearGradient>
      </defs>
      <rect x={10} y={20} width={180} height={10} fill={`url(#${gradId})`} rx={5} />
      <rect x={10} y={20} width={180} height={10} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} rx={5} />
      <text x={10}  y={40} textAnchor="start"  fontSize="7" fill="#FF3D00" opacity={0.8}>Pressão USD</text>
      <text x={100} y={40} textAnchor="middle" fontSize="7" fill="var(--text-muted)">Neutro</text>
      <text x={190} y={40} textAnchor="end"    fontSize="7" fill="#00C853" opacity={0.8}>Favorável</text>
      <line x1={needleX} y1={16} x2={needleX} y2={34} stroke="rgba(255,255,255,0.5)" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={needleX} cy={25} r={4.5} fill={color} />
      <text x={needleX} y={12} textAnchor="middle" fontSize="9" fill={color} fontWeight="800">
        {score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1)}
      </text>
    </svg>
  )
}

function SynthesisDots({ indicators }: { indicators: IndicatorScore[] }) {
  const bullish = indicators.filter(i => i.score > 0).length
  const neutral  = indicators.filter(i => i.score === 0).length
  const bearish  = indicators.filter(i => i.score < 0).length
  const cols     = 5
  const dotR     = 5
  const gap      = 16
  const rows     = Math.ceil(indicators.length / cols)

  return (
    <div>
      <svg width={cols * gap + 4} height={rows * gap + 8}
        viewBox={`0 0 ${cols * gap + 4} ${rows * gap + 8}`}>
        {indicators.map((ind, i) => {
          const col   = i % cols
          const row   = Math.floor(i / cols)
          const color = ind.score > 0 ? '#00C853' : ind.score < 0 ? '#FF6D00' : '#455A64'
          return (
            <circle key={ind.name} cx={col * gap + dotR + 4} cy={row * gap + dotR + 4} r={dotR} fill={color} opacity={0.85} />
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: '10px', fontSize: '9px', marginTop: '4px' }}>
        <span style={{ color: '#00C853' }}>● {bullish} bullish</span>
        <span style={{ color: '#455A64' }}>● {neutral} neutro</span>
        <span style={{ color: '#FF6D00' }}>● {bearish} bearish</span>
      </div>
    </div>
  )
}

export default function DimensionVisual({ groupKey, score, indicators }: DimensionVisualProps) {
  switch (groupKey) {
    case 'trend':       return <TrendMeter score={score} />
    case 'sentiment':   return <SentimentSpectrum score={score} />
    case 'derivatives': return <LeveragePressure indicators={indicators} />
    case 'onchain':     return <CycleArc score={score} />
    case 'macro':       return <MacroCompass score={score} />
    case 'synthesis':   return <SynthesisDots indicators={indicators} />
    default:            return null
  }
}
