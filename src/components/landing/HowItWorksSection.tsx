// src/components/landing/HowItWorksSection.tsx

const STEPS = [
  {
    n:    '01',
    title: 'Cria conta com Google',
    desc:  'Login em um clique. Sem formulário, sem senha para lembrar.',
  },
  {
    n:    '02',
    title: 'Configura seu plano DCA',
    desc:  'Informe valor mensal, perfil de risco e reserva estratégica. O sistema gera recomendações de aporte baseadas no contexto de mercado.',
  },
  {
    n:    '03',
    title: 'Acompanha o painel e os alertas',
    desc:  'Indicadores on-chain e de derivativos organizados por dimensão. Configure alertas para ser notificado por e-mail ou Telegram quando os critérios forem atingidos.',
  },
  {
    n:    '04',
    title: 'Registra cada aporte',
    desc:  'Informe valor, BTC comprado, cotação do mercado e outros custos (taxas, spread). O sistema calcula o preço efetivo de cada compra automaticamente.',
  },
  {
    n:    '05',
    title: 'Acompanha sua rentabilidade',
    desc:  'O histórico mostra preço médio acumulado, cotação atual do BTC, variação e rentabilidade ponderada em tempo real. Análise de custos por período incluída.',
  },
  {
    n:    '06',
    title: 'Decide manualmente',
    desc:  'O app não compra por você. Ele organiza os dados e orienta o timing. A decisão final é sempre sua.',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" style={{
      padding:    '80px 24px',
      maxWidth:   '960px',
      margin:     '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Fluxo</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Como funciona</h2>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
        {STEPS.map(({ n, title, desc }, i) => (
          <div
            key={n}
            style={{
              display:      'flex',
              gap:          '24px',
              alignItems:   'flex-start',
              paddingBottom: i < STEPS.length - 1 ? '32px' : '0',
            }}
          >
            {/* Number + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width:        '40px',
                height:       '40px',
                borderRadius: '50%',
                background:   'var(--orange-subtle)',
                border:       '1px solid var(--border-strong)',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                fontSize:     '12px',
                fontWeight:   700,
                color:        'var(--orange)',
                flexShrink:   0,
              }}>
                {n}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: '1px', flex: 1, background: 'var(--border-dim)', marginTop: '8px' }} />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingTop: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>{title}</div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-sec)', lineHeight: 1.7 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
