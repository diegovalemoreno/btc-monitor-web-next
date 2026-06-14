'use client'

import { useState, useEffect } from 'react'

const fmtBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

const fmtUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export default function BtcPriceInline() {
  const [brl, setBrl] = useState<number | null>(null)
  const [usd, setUsd] = useState<number | null>(null)

  useEffect(() => {
    const poll = () => {
      fetch('/api/btc-price-brl')
        .then(r => r.ok ? r.json() : null)
        .then((d: { btcPriceBrl?: number; btcPriceUsd?: number } | null) => {
          if (d?.btcPriceBrl) setBrl(d.btcPriceBrl)
          if (d?.btcPriceUsd) setUsd(d.btcPriceUsd)
        })
        .catch(() => {})
    }
    poll()
    const id = setInterval(poll, 60_000)
    return () => clearInterval(id)
  }, [])

  if (!brl) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>₿</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {fmtBRL(brl)}
      </span>
      {usd !== null && usd > 0 && (
        <>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.5 }}>·</span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {fmtUSD(usd)}
          </span>
        </>
      )}
    </div>
  )
}
