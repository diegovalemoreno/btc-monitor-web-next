// src/components/dashboard/InsightsPanel.tsx
interface InsightsPanelProps {
  insights: string[]
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
  if (!insights || insights.length === 0) return null

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '12px',
      padding:      '20px 24px',
      marginBottom: '24px',
    }}>
      <div style={{
        fontSize:      '11px',
        fontWeight:    600,
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom:  '14px',
      }}>
        Observações
      </div>
      <ul style={{
        margin:         0,
        padding:        0,
        listStyle:      'none',
        display:        'flex',
        flexDirection:  'column',
        gap:            '8px',
      }}>
        {insights.map((ins, i) => (
          <li key={i} style={{
            display:    'flex',
            gap:        '10px',
            fontSize:   '13px',
            color:      'var(--text-sec)',
            lineHeight: 1.6,
          }}>
            <span style={{ color: 'var(--orange)', flexShrink: 0 }}>·</span>
            {ins}
          </li>
        ))}
      </ul>
    </div>
  )
}
