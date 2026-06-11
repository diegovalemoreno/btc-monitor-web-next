'use client'

import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const next = searchParams.get('next') ?? '/analise-tatica'

  async function handleGoogleLogin() {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!url || !key) {
        alert(`Env vars ausentes — URL: ${url ?? 'undefined'}, KEY: ${key ? 'ok' : 'undefined'}`)
        return
      }
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (error) alert(`Erro OAuth: ${error.message}`)
    } catch (e) {
      alert(`Exceção: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', marginBottom: '12px', textShadow: 'var(--brand-glow)' }}>
            BTC Monitor
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
            Leitura inteligente<br />do mercado Bitcoin
          </h1>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)' }} />

        {/* Auth */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error === 'auth_failed' && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.2)', borderRadius: '8px', fontSize: '13px', color: '#ff6d6d' }}>
              Falha na autenticação. Tente novamente.
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            style={{
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             '12px',
              width:           '100%',
              padding:         '14px 24px',
              backgroundColor: 'var(--orange)',
              color:           'var(--bg)',
              border:          'none',
              borderRadius:    '8px',
              fontSize:        '14px',
              fontWeight:      600,
              cursor:          'pointer',
              transition:      'opacity 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            <GoogleIcon />
            Entrar com Google
          </button>
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
          As informações exibidas possuem caráter educacional e analítico.
          Nada neste sistema constitui recomendação financeira ou promessa de retorno.
        </p>

      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#0a0a0a" fillOpacity=".8"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#0a0a0a" fillOpacity=".7"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#0a0a0a" fillOpacity=".6"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#0a0a0a" fillOpacity=".5"/>
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
