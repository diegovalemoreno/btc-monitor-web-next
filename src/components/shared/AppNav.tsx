'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard' },
  { label: 'Alertas',      href: '/alerts'    },
  { label: 'DCA',          href: '/dca'       },
  { label: 'Configurações', href: '/settings'  },
]

interface AppNavProps {
  userEmail: string
}

export default function AppNav({ userEmail }: AppNavProps) {
  const pathname = usePathname()
  const router   = useRouter()

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
        maxWidth:      '960px',
        margin:        '0 auto',
        padding:       '0 24px',
        height:        '52px',
        display:       'flex',
        alignItems:    'center',
        justifyContent: 'space-between',
      }}>

        {/* Brand + links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--orange)', textTransform: 'uppercase', textShadow: 'var(--brand-glow)' }}>
            BTC Monitor
          </span>
          <div className="nav-links">
            {NAV_ITEMS.map(({ label, href }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
              return (
                <a
                  key={href}
                  href={href}
                  style={{
                    padding:         '6px 12px',
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

        {/* User + sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="hide-mobile" style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail}
          </span>
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
