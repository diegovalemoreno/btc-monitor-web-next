// src/components/landing/HowItWorksSection.tsx

const STEPS = [
  {
    n:    '01',
    title: 'Cria conta com Google',
    desc:  'Login em um clique. Sem formulário, sem senha para lembrar.',
  },
  {
    n:    '02',
    title: 'Acompanha o painel',
    desc:  'Indicadores atualizados diariamente, organizados por dimensão de mercado.',
  },
  {
    n:    '03',
    title: 'Configura seus alertas',
    desc:  'Defina critérios para Fear & Greed, Funding Rate, variação de preço e outros.',
  },
  {
    n:    '04',
    title: 'Recebe notificações',
    desc:  'Quando um alerta dispara, você é notificado por e-mail ou Telegram.',
  },
  {
    n:    '05',
    title: 'Decide manualmente',
    desc:  'O app não compra por você. Ele organiza os dados. A decisão é sempre sua.',
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
