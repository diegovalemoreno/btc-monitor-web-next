import type { SnapshotScores } from '@/domain/snapshot-scores'

interface DimCard {
  key:   keyof SnapshotScores
  label: string
  color: string
}

const DIMS: DimCard[] = [
  { key: 'opportunityScore',  label: 'Oportunidade', color: '#00C853' },
  { key: 'riskScore',         label: 'Risco',        color: '#FF6D00' },
  { key: 'convictionScore',   label: 'Convicção',    color: '#e08a3a' },
  { key: 'euphoriaScore',     label: 'Euforia',      color: '#FF1744' },
]

function arc(pct: number, color: string) {
  const r   = 22
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#1e1e1e" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
      />
    </svg>
  )
}

export default function DimensionScores({ scores }: { scores: SnapshotScores }) {
  return (
    <div className="grid-4" style={{ marginBottom: '24px' }}>
      {DIMS.map(({ key, label, color }) => {
        const val = Math.round(scores[key] ?? 0)
        return (
          <div key={key} style={{
            background:   '#111111',
            border:       '1px solid rgba(224,138,58,0.1)',
            borderRadius: '10px',
            padding:      '16px',
            display:      'flex',
            flexDirection: 'column',
            alignItems:   'center',
            gap:          '8px',
          }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {arc(val, color)}
              <span style={{ position: 'absolute', fontSize: '12px', fontWeight: 700, color }}>{val}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#b0a090', textAlign: 'center' }}>{label}</div>
          </div>
        )
      })}
    </div>
  )
}
