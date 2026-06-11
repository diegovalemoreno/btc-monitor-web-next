'use client'

interface Props {
  score: number  // 0-100
}

export default function OpportunityBar({ score }: Props) {
  const thumbPct = Math.max(2, Math.min(98, score))

  return (
    <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        fontSize:       '11px',
        color:          'var(--text-muted)',
        marginBottom:   '10px',
        letterSpacing:  '0.5px',
        textTransform:  'uppercase',
      }}>
        <span>Péssimo</span>
        <span>Regular</span>
        <span>Oportunidade</span>
      </div>

      <div style={{
        height:       '12px',
        borderRadius: '999px',
        position:     'relative',
        background:   'linear-gradient(to right, #7f1d1d 0%, #ef4444 15%, #f97316 28%, #eab308 42%, #84cc16 58%, #22c55e 75%, #10b981 88%, #059669 100%)',
        boxShadow:    '0 0 16px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          width:      '22px',
          height:     '22px',
          background: 'var(--surface)',
          borderRadius:  '50%',
          border:        '3px solid rgba(0,0,0,0.2)',
          position:      'absolute',
          top:           '50%',
          left:          `${thumbPct}%`,
          transform:     'translate(-50%, -50%)',
          transition:    'left 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow:     '0 0 12px rgba(255,255,255,0.6), 0 2px 8px rgba(0,0,0,0.35)',
        }} />
      </div>

      <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Score <strong style={{ color: 'var(--text)' }}>{Math.round(score)}</strong> / 100
      </div>
    </div>
  )
}
