'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/contexts/ThemeContext'

const NAV_ITEMS = [
  { label: 'Resumo',         href: '/resumo'        },
  { label: 'Análise Tática', href: '/dashboard'    },
  { label: 'Rentabilidade',  href: '/rentabilidade' },
  { label: 'Alertas',        href: '/alerts'        },
  { label: 'DCA Estratégico', href: '/dca'           },
  { label: 'DCA Tático',     href: '/dca/tatico'    },
  { label: 'Lançamento',     href: '/lancamento'    },
  { label: 'Configurações',  href: '/settings'      },
]

const THEME_SWATCHES = [
  { value: 'dark'    as const, bg: '#0a0a0a', accent: '#e08a3a', title: 'Dark'    },
  { value: 'light'   as const, bg: '#f4f2ee', accent: '#c87028', title: 'Light'   },
  { value: 'orange'  as const, bg: '#0c0a02', accent: '#f09830', title: 'Orange'  },
  { value: 'celeste' as const, bg: '#04080f', accent: '#38bdf8', title: 'Celeste' },
]

interface AppNavProps {
  userEmail:     string
  userAvatarUrl?: string | null
}

export default function AppNav({ userEmail, userAvatarUrl }: AppNavProps) {
  const pathname          = usePathname()
  const router            = useRouter()
  const { theme, setTheme } = useTheme()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav style={{
      position:        'sticky',
      top:             0,
      zIndex:          50,
      backgroundColor: 'var(--nav-bg)',
      borderBottom:    '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth:       '1280px',
        margin:         '0 auto',
        padding:        '0 24px',
        height:         '52px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            '16px',
      }}>

        {/* Brand + links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', overflow: 'hidden', minWidth: 0 }}>
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', textShadow: 'var(--brand-glow)', flexShrink: 0 }}>
            BTC Monitor
          </span>
          <div className="nav-links">
            {NAV_ITEMS.map(({ label, href }) => {
              const active = pathname === href || (href !== '/dashboard' && href !== '/resumo' && pathname.startsWith(href))
              return (
                <a
                  key={href}
                  href={href}
                  style={{
                    padding:         '6px 10px',
                    borderRadius:    '6px',
                    fontSize:        '13px',
                    fontWeight:      active ? 600 : 400,
                    color:           active ? 'var(--text)' : 'var(--text-muted)',
                    backgroundColor: active ? 'var(--orange-subtle)' : 'transparent',
                    textDecoration:  'none',
                    whiteSpace:      'nowrap',
                    flexShrink:      0,
                  }}
                >
                  {label}
                </a>
              )
            })}
          </div>
        </div>

        {/* Right: theme switcher + avatar + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

          {/* Theme switcher dots */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }} className="hide-mobile">
            {THEME_SWATCHES.map(s => (
              <button
                key={s.value}
                onClick={() => setTheme(s.value)}
                title={s.title}
                style={{
                  width:        '16px',
                  height:       '16px',
                  borderRadius: '50%',
                  background:   `linear-gradient(135deg, ${s.bg} 50%, ${s.accent} 50%)`,
                  border:       theme === s.value ? '2px solid var(--orange)' : '1.5px solid var(--border-strong)',
                  cursor:       'pointer',
                  padding:      0,
                  flexShrink:   0,
                  transition:   'transform 0.12s',
                  transform:    theme === s.value ? 'scale(1.25)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {/* Avatar */}
          {userAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatarUrl}
              alt={userEmail.charAt(0).toUpperCase()}
              width={28}
              height={28}
              referrerPolicy="no-referrer"
              style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }}
            />
          ) : (
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--bg)', flexShrink: 0 }}>
              {userEmail.charAt(0).toUpperCase()}
            </div>
          )}

          <button
            onClick={handleSignOut}
            style={{
              padding:         '6px 12px',
              backgroundColor: 'transparent',
              color:           'var(--text-muted)',
              border:          '1px solid var(--border)',
              borderRadius:    '6px',
              fontSize:        '12px',
              cursor:          'pointer',
            }}
          >
            Sair
          </button>
        </div>

      </div>
    </nav>
  )
}
