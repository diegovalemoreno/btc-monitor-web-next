function scoreColor(s: number): string {
  if (s >= 4)  return '#22c55e'
  if (s >= 1)  return '#84cc16'
  if (s >= -1) return '#71717a'
  if (s >= -4) return '#f97316'
  return '#ef4444'
}

interface Props {
  label: string
  score: number
}

export default function TacticalSectionHeader({ label, score }: Props) {
  const color = scoreColor(score)
  const sign  = score > 0 ? '+' : ''

  return (
    <div style={{
      padding:       '16px 32px 12px',
      fontSize:      '11px',
      textTransform: 'uppercase',
      letterSpacing: '1.2px',
      color:         'var(--text-muted)',
      borderBottom:  '1px solid var(--border)',
      display:       'flex',
      alignItems:    'center',
      gap:           '8px',
    }}>
      <div style={{ width: '3px', height: '16px', background: 'var(--orange)', borderRadius: '2px', flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontWeight: 700, color, fontSize: '12px' }}>
        {sign}{score} pts
      </span>
    </div>
  )
}
