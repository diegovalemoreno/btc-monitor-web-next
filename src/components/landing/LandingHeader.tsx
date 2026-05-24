'use client'

interface LandingHeaderProps {
  isAuthenticated: boolean
}

export default function LandingHeader({ isAuthenticated }: LandingHeaderProps) {
  return (
    <header style={{
      position:        'sticky',
      top:             0,
      zIndex:          50,
      backgroundColor: 'var(--nav-bg)',
      borderBottom:    '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth:       '960px',
        margin:         '0 auto',
        padding:        '0 24px',
        height:         '52px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand */}
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontSize:      '12px',
            fontWeight:    700,
            letterSpacing: '0.15em',
            color:         'var(--orange)',
            textTransform: 'uppercase',
            textShadow:    'var(--brand-glow)',
          }}>
            BTC Monitor
          </span>
        </a>

        {/* Links âncora */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { label: 'Indicadores', href: '#indicadores' },
            { label: 'Como funciona', href: '#como-funciona' },
            { label: 'App por dentro', href: '#app' },
            { label: 'Diferenciais', href: '#diferenciais' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              style={{
                padding:        '6px 10px',
                fontSize:       '13px',
                color:          'var(--text-muted)',
                textDecoration: 'none',
                borderRadius:   '6px',
                whiteSpace:     'nowrap',
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {isAuthenticated ? (
            <a
              href="/dashboard"
              style={{
                padding:         '7px 16px',
                backgroundColor: 'var(--orange)',
                color:           'var(--bg)',
                border:          'none',
                borderRadius:    '7px',
                fontSize:        '13px',
                fontWeight:      600,
                textDecoration:  'none',
                whiteSpace:      'nowrap',
              }}
            >
              Dashboard →
            </a>
          ) : (
            <a
              href="/login"
              style={{
                padding:         '7px 16px',
                backgroundColor: 'var(--orange)',
                color:           'var(--bg)',
                border:          'none',
                borderRadius:    '7px',
                fontSize:        '13px',
                fontWeight:      600,
                textDecoration:  'none',
                whiteSpace:      'nowrap',
              }}
            >
              Entrar
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
