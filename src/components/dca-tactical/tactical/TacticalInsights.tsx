interface Props {
  insights: string[]
}

export default function TacticalInsights({ insights }: Props) {
  if (!insights || insights.length === 0) return null

  return (
    <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <div style={{ width: '3px', height: '14px', background: 'var(--orange)', borderRadius: '2px' }} />
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Observações Institucionais
        </div>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {insights.map((item, i) => (
          <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--orange)', flexShrink: 0, marginTop: '2px' }}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
