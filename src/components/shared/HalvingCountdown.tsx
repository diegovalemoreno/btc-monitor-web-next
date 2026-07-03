'use client'

import { useEffect, useState } from 'react'

interface HalvingData {
  currentHeight:    number
  nextHalvingBlock: number
  remainingBlocks:  number
  estimatedDate:    string
  epochProgressPct: number
}

interface TimeLeft {
  days:    number
  hours:   number
  minutes: number
  seconds: number
}

function diffToTimeLeft(targetMs: number, nowMs: number): TimeLeft {
  const diffSec = Math.max(0, Math.floor((targetMs - nowMs) / 1000))
  return {
    days:    Math.floor(diffSec / 86400),
    hours:   Math.floor((diffSec % 86400) / 3600),
    minutes: Math.floor((diffSec % 3600) / 60),
    seconds: diffSec % 60,
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatCompact(timeLeft: TimeLeft): string {
  return `${timeLeft.days}d ${pad(timeLeft.hours)}h ${pad(timeLeft.minutes)}m ${pad(timeLeft.seconds)}s`
}

function DigitCard({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      background:   'var(--surface2)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '8px',
      padding:      '16px 12px',
      textAlign:    'center',
      minWidth:     '72px',
    }}>
      <div style={{
        fontSize:           '28px',
        fontWeight:         700,
        color:              'var(--text)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{
        fontSize:      '10px',
        color:         'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginTop:     '4px',
      }}>
        {label}
      </div>
    </div>
  )
}

interface Props { compact?: boolean }

export default function HalvingCountdown({ compact = false }: Props) {
  const [data, setData]   = useState<HalvingData | null>(null)
  const [error, setError] = useState(false)
  const [now, setNow]     = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/btc-halving')
        if (!res.ok) throw new Error('failed')
        const json: HalvingData = await res.json()
        if (!cancelled) {
          setData(json)
          setError(false)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }

    load()
    const refetchId = setInterval(load, 300_000)
    return () => { cancelled = true; clearInterval(refetchId) }
  }, [])

  useEffect(() => {
    const tickId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickId)
  }, [])

  const timeLeft = data ? diffToTimeLeft(new Date(data.estimatedDate).getTime(), now) : null

  if (compact) {
    return (
      <div style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderTop:    '2px solid var(--orange)',
        borderRadius: '12px',
        padding:      '20px 22px',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.11em', marginBottom: '12px' }}>
          Próximo Halving
        </div>
        {error && !data ? (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Estimativa indisponível no momento.
          </div>
        ) : (
          <>
            <div style={{
              fontSize:           '24px',
              fontWeight:         800,
              color:              'var(--orange)',
              letterSpacing:      '-0.5px',
              fontVariantNumeric: 'tabular-nums',
              lineHeight:         1.1,
            }}>
              {timeLeft ? formatCompact(timeLeft) : '--'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              {data
                ? `≈ ${new Date(data.estimatedDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Carregando estimativa...'}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <section style={{ padding: '80px 24px', maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{
        fontSize:      '11px',
        fontWeight:    600,
        color:         'var(--orange)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        marginBottom:  '8px',
      }}>
        Próximo Halving
      </div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: '0 0 32px' }}>
        Contagem regressiva até a próxima redução de emissão
      </h2>

      {error && !data ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Estimativa indisponível no momento.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
            <DigitCard value={timeLeft ? String(timeLeft.days) : '--'} label="Dias" />
            <DigitCard value={timeLeft ? pad(timeLeft.hours) : '--'} label="Horas" />
            <DigitCard value={timeLeft ? pad(timeLeft.minutes) : '--'} label="Min" />
            <DigitCard value={timeLeft ? pad(timeLeft.seconds) : '--'} label="Seg" />
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
            {data
              ? `≈ ${new Date(data.estimatedDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} · faltam ${data.remainingBlocks.toLocaleString('pt-BR')} blocos até o bloco ${data.nextHalvingBlock.toLocaleString('pt-BR')}`
              : 'Carregando estimativa...'}
          </p>
        </>
      )}
    </section>
  )
}
