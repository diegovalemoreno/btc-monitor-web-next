// src/components/landing/LandingCTA.tsx

interface LandingCTAProps {
  isAuthenticated: boolean
}

export default function LandingCTA({ isAuthenticated }: LandingCTAProps) {
  return (
    <section style={{
      padding:    '96px 24px',
      textAlign:  'center',
      maxWidth:   '640px',
      margin:     '0 auto',
    }}>
      <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.25 }}>
        Pronto para acompanhar o Bitcoin com dados?
      </h2>
      <p style={{ fontSize: '15px', color: 'var(--text-sec)', margin: '0 0 32px', lineHeight: 1.6 }}>
        {isAuthenticated
          ? 'Você já tem acesso. Abra o painel e acompanhe os indicadores.'
          : 'Login gratuito com Google. Sem formulário, sem senha.'}
      </p>

      <a
        href={isAuthenticated ? '/dashboard' : '/login'}
        style={{
          display:         'inline-block',
          padding:         '14px 36px',
          backgroundColor: 'var(--orange)',
          color:           'var(--bg)',
          borderRadius:    '8px',
          fontSize:        '15px',
          fontWeight:      600,
          textDecoration:  'none',
          marginBottom:    '32px',
        }}
      >
        {isAuthenticated ? 'Ir ao dashboard →' : 'Entrar com Google'}
      </a>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.7 }}>
        As informações exibidas possuem caráter educacional e analítico.<br />
        Nada neste sistema constitui recomendação financeira ou promessa de retorno.
      </p>
    </section>
  )
}
