// src/components/dashboard/InsightsPanel.tsx

interface InsightsPanelProps {
  insights: string[]
}

type InsightType = 'bull' | 'warn' | 'neutral'

function insightType(text: string): InsightType {
  if (text.startsWith('✓') || text.startsWith('✅')) return 'bull'
  if (text.startsWith('⚠') || text.startsWith('⚡')) return 'warn'
  return 'neutral'
}

function splitText(text: string): { bold: string; rest: string } {
  const clean  = text.replace(/^[✓✅⚠⚡]\s*/, '').trim()
  const dotIdx = clean.indexOf('.')
  if (dotIdx === -1) return { bold: clean, rest: '' }
  return {
    bold: clean.slice(0, dotIdx),
    rest: clean.slice(dotIdx + 1).trim(),
  }
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
        fontSize:      '10px',
        fontWeight:    700,
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        marginBottom:  '14px',
      }}>
        Observações Institucionais
      </div>

      <div>
        {insights.map((ins, i) => {
          const type           = insightType(ins)
          const { bold, rest } = splitText(ins)
          const isLast         = i === insights.length - 1

          const iconBg    = type === 'bull' ? 'rgba(0,200,83,0.12)'   : type === 'warn' ? 'rgba(224,138,58,0.12)' : 'var(--surface3)'
          const iconColor = type === 'bull' ? '#00C853'                : type === 'warn' ? 'var(--orange)'         : 'var(--text-muted)'
          const iconChar  = type === 'bull' ? '✓'                      : type === 'warn' ? '⚠'                     : '·'

          return (
            <div key={i} style={{
              display:      'flex',
              gap:          '12px',
              alignItems:   'flex-start',
              padding:      '10px 0',
              borderBottom: isLast ? 'none' : '1px solid var(--border-dim)',
            }}>
              <div style={{
                width:          '22px',
                height:         '22px',
                borderRadius:   '50%',
                background:     iconBg,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       '10px',
                color:          iconColor,
                flexShrink:     0,
                marginTop:      '1px',
              }}>
                {iconChar}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-sec)', lineHeight: 1.6 }}>
                {bold && (
                  <strong style={{ color: 'var(--text)', fontWeight: 600 }}>
                    {bold}.{' '}
                  </strong>
                )}
                {rest}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
