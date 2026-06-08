'use client'

interface BucketConfig {
  maxScore:  number
  title:     string
  subtitle:  string
  winRate:   number
  avgReturn: number
}

const BUCKETS: BucketConfig[] = [
  {
    maxScore:  20,
    title:     'OPORTUNIDADE ÚNICA',
    subtitle:  'Confluência rara — histórico mostra retornos excepcionais em 12 meses a partir deste ponto',
    winRate:   92,
    avgReturn: 190,
  },
  {
    maxScore:  35,
    title:     'OPORTUNIDADE FORTE',
    subtitle:  'Fundo de ciclo detectado — janela histórica de acumulação confirmada pelos indicadores',
    winRate:   87,
    avgReturn: 130,
  },
  {
    maxScore:  55,
    title:     'MOMENTO FAVORÁVEL',
    subtitle:  'Condições táticas favoráveis — historicamente bom ponto de entrada em 12 meses',
    winRate:   78,
    avgReturn: 87,
  },
]

interface Props { score: number }

export default function TacticalOpportunityBanner({ score }: Props) {
  const config = BUCKETS.find(b => score < b.maxScore)
  if (!config) return null

  const accentColor = score < 20 ? '#22c55e' : '#84cc16'

  return (
    <div style={{
      padding:      '28px 32px',
      borderBottom: '1px solid var(--border)',
      background:   `linear-gradient(135deg, rgba(132,204,22,0.07) 0%, rgba(34,197,94,0.03) 100%)`,
      borderLeft:   `3px solid ${accentColor}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '32px', flexWrap: 'wrap' }}>

        {/* Left: title + text */}
        <div style={{ flex: 1, minWidth: '240px' }}>
          <div style={{
            fontSize:      '11px',
            fontWeight:    800,
            color:         accentColor,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            marginBottom:  '10px',
          }}>
            {config.title}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.45, marginBottom: '10px' }}>
            {config.subtitle}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            baseado nos 4 ciclos completos do Bitcoin (2013–2024)
          </div>
        </div>

        {/* Right: stats */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          <div>
            <div style={{
              fontSize:      '38px',
              fontWeight:    900,
              color:         accentColor,
              letterSpacing: '-1.5px',
              lineHeight:    1,
            }}>
              {config.winRate}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '120px', lineHeight: 1.4 }}>
              das vezes retorno positivo em 1 ano
            </div>
          </div>
          <div style={{ width: '1px', height: '48px', background: 'var(--border)', flexShrink: 0 }} />
          <div>
            <div style={{
              fontSize:      '38px',
              fontWeight:    900,
              color:         '#22c55e',
              letterSpacing: '-1.5px',
              lineHeight:    1,
            }}>
              +{config.avgReturn}%
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: 1.4 }}>
              retorno médio 12m
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
