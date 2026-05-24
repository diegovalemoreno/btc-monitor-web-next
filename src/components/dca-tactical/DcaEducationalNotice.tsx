'use client'

export default function DcaEducationalNotice() {
  return (
    <div style={{
      padding:      '16px 20px',
      background:   'var(--surface2)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '10px',
      display:      'flex',
      gap:          '12px',
      alignItems:   'flex-start',
      marginBottom: '24px',
    }}>
      <span style={{ fontSize: '14px', color: 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }}>⚠</span>
      <p style={{
        margin:     0,
        fontSize:   '12px',
        color:      'var(--text-muted)',
        lineHeight: 1.65,
      }}>
        Esta análise não é recomendação financeira. O objetivo é apoiar disciplina de aporte
        com base em dados de mercado. Scores e alocações são sugestões orientativas —
        a decisão final é sempre sua. Nenhum sistema pode garantir lucro ou antecipar fundos de mercado.
      </p>
    </div>
  )
}
