// src/components/landing/LandingHero.tsx

interface LandingHeroProps {
  isAuthenticated: boolean
}

export default function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const ctaHref  = isAuthenticated ? '/analise-tatica' : '/login'
  const ctaLabel = isAuthenticated ? 'Ir à análise tática →' : 'Acessar o app'

  return (
    <section style={{
      padding:    '80px 24px 64px',
      textAlign:  'center',
      maxWidth:   '720px',
      margin:     '0 auto',
    }}>
      {/* Badge */}
      <div style={{
        display:         'inline-block',
        background:      'var(--orange-subtle)',
        border:          '1px solid var(--border-strong)',
        borderRadius:    '4px',
        padding:         '4px 12px',
        fontSize:        '11px',
        fontWeight:      600,
        color:           'var(--orange)',
        letterSpacing:   '0.12em',
        textTransform:   'uppercase',
        marginBottom:    '20px',
      }}>
        Bitcoin · Análise tática
      </div>

      {/* Título */}
      <h1 style={{
        fontSize:     'clamp(26px, 5vw, 40px)',
        fontWeight:   700,
        color:        'var(--text)',
        lineHeight:   1.2,
        margin:       '0 0 16px',
      }}>
        Leitura inteligente<br />do mercado Bitcoin
      </h1>

      {/* Subtítulo */}
      <p style={{
        fontSize:   '16px',
        color:      'var(--text-sec)',
        lineHeight: 1.7,
        margin:     '0 auto 32px',
        maxWidth:   '520px',
      }}>
        Indicadores organizados, alertas configuráveis e sinais históricos — tudo em um painel para acompanhar o Bitcoin com mais disciplina.
      </p>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
        <a
          href={ctaHref}
          style={{
            padding:         '12px 28px',
            backgroundColor: 'var(--orange)',
            color:           'var(--bg)',
            border:          'none',
            borderRadius:    '8px',
            fontSize:        '14px',
            fontWeight:      600,
            textDecoration:  'none',
          }}
        >
          {ctaLabel}
        </a>
        <a
          href="#indicadores"
          style={{
            padding:        '12px 28px',
            backgroundColor: 'transparent',
            color:           'var(--text-sec)',
            border:          '1px solid var(--border)',
            borderRadius:    '8px',
            fontSize:        '14px',
            textDecoration:  'none',
          }}
        >
          Ver indicadores
        </a>
      </div>

      {/* Mini mockup */}
      <div style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: '12px',
        padding:      '20px',
        textAlign:    'left',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
          Dashboard · Regime de mercado
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { label: 'Fear & Greed', value: '47', color: '#FFD600' },
            { label: 'Funding Rate', value: '+0.01%', color: '#69F0AE' },
            { label: 'MVRV Z-Score', value: '1.8', color: '#FFD600' },
            { label: '7 dias', value: '+4.2%', color: '#69F0AE' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background:   'var(--surface2)',
                border:       '1px solid var(--border-dim)',
                borderRadius: '8px',
                padding:      '12px',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
