'use client'

import { useTheme, type Theme } from '@/contexts/ThemeContext'

const THEMES: { value: Theme; label: string; desc: string; preview: string[] }[] = [
  {
    value:   'dark',
    label:   'Dark',
    desc:    'Padrão recomendado. Escuro com accent laranja Bitcoin.',
    preview: ['#0a0a0a', '#111111', '#e08a3a'],
  },
  {
    value:   'light',
    label:   'Light',
    desc:    'Fundo claro, superfícies neutras, accent laranja.',
    preview: ['#f4f2ee', '#ffffff', '#c87028'],
  },
  {
    value:   'orange',
    label:   'Orange',
    desc:    'Para bitcoiners. Escuro com maior presença de laranja.',
    preview: ['#0c0a02', '#141004', '#f09830'],
  },
  {
    value:   'celeste',
    label:   'Celeste',
    desc:    'Escuro com accent azul céu. Alternativa ao tema laranja.',
    preview: ['#04080f', '#0a1220', '#38bdf8'],
  },
]

export default function ThemePicker() {
  const { theme, setTheme } = useTheme()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {THEMES.map((t) => {
        const active = theme === t.value
        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            style={{
              display:         'flex',
              alignItems:      'center',
              gap:             '14px',
              padding:         '14px 18px',
              background:      active ? 'var(--orange-subtle)' : 'var(--surface)',
              border:          `1px solid ${active ? 'var(--border-strong)' : 'var(--border-dim)'}`,
              borderRadius:    '10px',
              cursor:          'pointer',
              textAlign:       'left',
              transition:      'border-color 0.15s, background 0.15s',
              width:           '100%',
            }}
          >
            {/* Swatch */}
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              {t.preview.map((c, i) => (
                <div
                  key={i}
                  style={{
                    width:        i === 2 ? '12px' : '10px',
                    height:       '32px',
                    borderRadius: '4px',
                    background:   c,
                    border:       '1px solid rgba(255,255,255,0.05)',
                  }}
                />
              ))}
            </div>

            {/* Label */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize:   '13px',
                fontWeight: active ? 600 : 500,
                color:      active ? 'var(--orange)' : 'var(--text)',
                marginBottom: '2px',
              }}>
                {t.label}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {t.desc}
              </div>
            </div>

            {/* Active indicator */}
            {active && (
              <div style={{
                width:        '6px',
                height:       '6px',
                borderRadius: '50%',
                background:   'var(--orange)',
                flexShrink:   0,
              }} />
            )}
          </button>
        )
      })}
    </div>
  )
}
