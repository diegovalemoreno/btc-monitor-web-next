'use client'

import { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  text:      string
  position?: 'top' | 'bottom' | 'left' | 'right'
  wide?:     boolean
}

export default function Tooltip({ text, position = 'top', wide = false }: TooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const offset: React.CSSProperties =
    position === 'top'    ? { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } :
    position === 'bottom' ? { top:    'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' } :
    position === 'left'   ? { right:  'calc(100% + 8px)', top: '50%',  transform: 'translateY(-50%)' } :
                            { left:   'calc(100% + 8px)', top: '50%',  transform: 'translateY(-50%)' }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Mais informações"
        style={{
          width:           '16px',
          height:          '16px',
          borderRadius:    '50%',
          border:          '1px solid rgba(224,138,58,0.3)',
          background:      'transparent',
          color:           '#5a5040',
          fontSize:        '10px',
          fontWeight:      700,
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
          lineHeight:      1,
          padding:         0,
        }}
      >
        ?
      </button>

      {open && (
        <div style={{
          position:      'absolute',
          ...offset,
          zIndex:        100,
          width:         wide ? '300px' : '240px',
          padding:       '10px 12px',
          background:    '#1e1e1e',
          border:        '1px solid rgba(224,138,58,0.2)',
          borderRadius:  '8px',
          fontSize:      '12px',
          color:         '#b0a090',
          lineHeight:    1.65,
          whiteSpace:    'pre-wrap',
          boxShadow:     '0 4px 16px rgba(0,0,0,0.4)',
          pointerEvents: 'none',
        }}>
          {text}
        </div>
      )}
    </div>
  )
}
