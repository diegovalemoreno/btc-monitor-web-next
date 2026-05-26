'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  text:      string
  position?: 'top' | 'bottom' | 'left' | 'right'
  wide?:     boolean
}

interface Coords { top: number; left: number }

const TOOLTIP_WIDTH      = 280
const TOOLTIP_MAX_MOBILE = 16   // padding from viewport edges
const GAP                = 8

export default function Tooltip({ text, position = 'top', wide = false }: TooltipProps) {
  const [open, setOpen]     = useState(false)
  const [coords, setCoords] = useState<Coords | null>(null)
  const btnRef              = useRef<HTMLButtonElement>(null)
  const tipRef              = useRef<HTMLDivElement>(null)

  const computeCoords = useCallback(() => {
    if (!btnRef.current) return
    const btn  = btnRef.current.getBoundingClientRect()
    const vw   = window.innerWidth
    const vh   = window.innerHeight
    const w    = Math.min(wide ? TOOLTIP_WIDTH : 240, vw - TOOLTIP_MAX_MOBILE * 2)
    const tipH = tipRef.current?.offsetHeight ?? 80

    let top: number
    let left: number

    if (position === 'right') {
      left = btn.right + GAP
      if (left + w > vw - TOOLTIP_MAX_MOBILE) left = btn.left - w - GAP
      left = Math.max(TOOLTIP_MAX_MOBILE, left)
      top  = btn.top + btn.height / 2 - tipH / 2
      top  = Math.max(TOOLTIP_MAX_MOBILE, Math.min(top, vh - tipH - TOOLTIP_MAX_MOBILE))
    } else if (position === 'left') {
      left = btn.left - w - GAP
      if (left < TOOLTIP_MAX_MOBILE) left = btn.right + GAP
      left = Math.max(TOOLTIP_MAX_MOBILE, left)
      top  = btn.top + btn.height / 2 - tipH / 2
      top  = Math.max(TOOLTIP_MAX_MOBILE, Math.min(top, vh - tipH - TOOLTIP_MAX_MOBILE))
    } else if (position === 'bottom') {
      top  = btn.bottom + GAP
      if (top + tipH > vh - TOOLTIP_MAX_MOBILE) top = btn.top - tipH - GAP
      left = btn.left + btn.width / 2 - w / 2
      left = Math.max(TOOLTIP_MAX_MOBILE, Math.min(left, vw - w - TOOLTIP_MAX_MOBILE))
    } else {
      top  = btn.top - tipH - GAP
      if (top < TOOLTIP_MAX_MOBILE) top = btn.bottom + GAP
      left = btn.left + btn.width / 2 - w / 2
      left = Math.max(TOOLTIP_MAX_MOBILE, Math.min(left, vw - w - TOOLTIP_MAX_MOBILE))
    }

    setCoords({ top, left })
  }, [position, wide])

  // Recompute when open changes (after portal renders tip)
  useEffect(() => {
    if (!open) { setCoords(null); return }
    // First pass: estimate; second pass after DOM paint
    computeCoords()
    requestAnimationFrame(computeCoords)
  }, [open, computeCoords])

  // Close on outside click/touch
  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent | TouchEvent) {
      const target = e.target as Node
      if (!btnRef.current?.contains(target) && !tipRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [open])

  // Close on scroll / resize
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, { passive: true, capture: true })
    window.addEventListener('resize', close, { passive: true })
    return () => {
      window.removeEventListener('scroll', close, { capture: true })
      window.removeEventListener('resize', close)
    }
  }, [open])

  const w = Math.min(wide ? TOOLTIP_WIDTH : 240, typeof window !== 'undefined' ? window.innerWidth - TOOLTIP_MAX_MOBILE * 2 : 240)

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="Mais informações"
        aria-expanded={open}
        style={{
          width:          '16px',
          height:         '16px',
          borderRadius:   '50%',
          border:         '1px solid rgba(224,138,58,0.3)',
          background:     open ? 'rgba(224,138,58,0.15)' : 'transparent',
          color:          '#8a7060',
          fontSize:       '10px',
          fontWeight:     700,
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexShrink:     0,
          lineHeight:     1,
          padding:        0,
          transition:     'background 0.15s',
        }}
      >
        ?
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          style={{
            position:     'fixed',
            top:          coords ? coords.top : -9999,
            left:         coords ? coords.left : -9999,
            width:        w,
            zIndex:       9999,
            padding:      '10px 12px',
            background:   '#1e1e1e',
            border:       '1px solid rgba(224,138,58,0.25)',
            borderRadius: '8px',
            fontSize:     '12px',
            color:        '#b0a090',
            lineHeight:   1.65,
            whiteSpace:   'pre-wrap',
            boxShadow:    '0 4px 20px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {text}
        </div>,
        document.body,
      )}
    </div>
  )
}
