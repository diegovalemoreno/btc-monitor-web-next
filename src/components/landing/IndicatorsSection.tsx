// src/components/landing/IndicatorsSection.tsx

interface Indicator {
  abbr:     string
  name:     string
  category: string
  desc:     string
  why:      string
  score:    string
  color:    string
}

const INDICATORS: Indicator[] = [
  {
    abbr: 'F&G', name: 'Fear & Greed Index', category: 'Sentimento',
    desc: 'Mede o sentimento predominante do mercado entre medo extremo e euforia excessiva.',
    why:  'Compras em medo extremo tendem a ser historicamente mais favoráveis do que em euforia.',
    score: '+1', color: '#FFD600',
  },
  {
    abbr: 'FR', name: 'Funding Rate', category: 'Derivativos',
    desc: 'Custo entre posições compradas e vendidas em contratos perpétuos.',
    why:  'Funding negativo pode sinalizar excesso de shorts e potencial squeeze de alta.',
    score: '+2', color: '#69F0AE',
  },
  {
    abbr: '7d', name: 'Variação em 7 dias', category: 'Tendência',
    desc: 'Variação percentual do preço do Bitcoin na última semana.',
    why:  'Quedas expressivas em curto prazo podem abrir janelas táticas de entrada.',
    score: '+1', color: '#FFD600',
  },
  {
    abbr: 'OI', name: 'Open Interest', category: 'Derivativos',
    desc: 'Volume total de contratos em aberto no mercado de derivativos.',
    why:  'OI crescente com preço caindo pode indicar pressão vendedora e risco de liquidações.',
    score: '0', color: '#b0a090',
  },
  {
    abbr: 'MV', name: 'MVRV Z-Score', category: 'On-chain',
    desc: 'Compara o valor de mercado com o valor realizado historicamente.',
    why:  'Z-score baixo historicamente coincide com fundos de ciclo e zonas de acumulação.',
    score: '+1', color: '#FFD600',
  },
  {
    abbr: 'RP', name: 'Realized Price', category: 'On-chain',
    desc: 'Preço médio estimado pelo qual os bitcoins se moveram pela última vez on-chain.',
    why:  'Preço abaixo do realized price indica que a rede está operando no prejuízo agregado.',
    score: '0', color: '#b0a090',
  },
  {
    abbr: 'HR', name: 'Hash Ribbon', category: 'Mineradores',
    desc: 'Observa médias de hash rate para identificar períodos de estresse dos mineradores.',
    why:  'Capitulação de mineradores precede historicamente recuperações de preço.',
    score: '+1', color: '#FFD600',
  },
  {
    abbr: 'PV', name: 'Pressão de venda', category: 'On-chain',
    desc: 'Indica se há aumento de oferta ou distribuição on-chain no mercado.',
    why:  'Pressão de venda elevada pode antecipar movimentos de baixa.',
    score: '0', color: '#b0a090',
  },
  {
    abbr: 'MM', name: 'Médias Móveis', category: 'Tendência',
    desc: 'Médias históricas de preço para visualizar tendência e regiões relevantes.',
    why:  'Preço próximo a médias de longo prazo pode indicar suporte ou resistência histórica.',
    score: '+1', color: '#FFD600',
  },
  {
    abbr: 'My', name: 'Meyer Multiple', category: 'On-chain',
    desc: 'Compara o preço atual com a média móvel de 200 dias.',
    why:  'Multiple abaixo de 1 historicamente aparece em zonas de compra favoráveis.',
    score: '+1', color: '#FFD600',
  },
]

function ScoreChip({ score, color }: { score: string; color: string }) {
  return (
    <div style={{
      padding:      '4px 10px',
      background:   `${color}18`,
      border:       `1px solid ${color}44`,
      borderRadius: '6px',
      fontSize:     '13px',
      fontWeight:   700,
      color,
      flexShrink:   0,
    }}>
      {score}
    </div>
  )
}

export default function IndicatorsSection() {
  return (
    <section id="indicadores" style={{ padding: '80px 24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Indicadores</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>O que o app monitora</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Nenhum indicador sozinho determina uma boa compra. O valor está em combinar sinais de sentimento, derivativos, on-chain e tendência.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {INDICATORS.map(({ abbr, name, category, desc, why, score, color }) => (
          <div
            key={abbr}
            style={{
              background:   'var(--surface)',
              border:       '1px solid var(--border-dim)',
              borderRadius: '10px',
              padding:      '16px 20px',
              display:      'flex',
              gap:          '16px',
              alignItems:   'flex-start',
            }}
          >
            {/* Badge */}
            <div style={{
              background:    'var(--orange-subtle)',
              border:        '1px solid var(--border-strong)',
              borderRadius:  '6px',
              padding:       '6px 10px',
              fontSize:      '11px',
              fontWeight:    700,
              color:         'var(--orange)',
              flexShrink:    0,
              minWidth:      '36px',
              textAlign:     'center',
              letterSpacing: '0.05em',
            }}>
              {abbr}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{name}</span>
                <span style={{
                  fontSize:      '10px',
                  color:         'var(--text-muted)',
                  background:    'var(--surface2)',
                  border:        '1px solid var(--border-dim)',
                  borderRadius:  '4px',
                  padding:       '2px 6px',
                  whiteSpace:    'nowrap',
                }}>
                  {category}
                </span>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-sec)', lineHeight: 1.5 }}>{desc}</p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>Por que importa: {why}</p>
            </div>

            {/* Score */}
            <ScoreChip score={score} color={color} />
          </div>
        ))}
      </div>
    </section>
  )
}
