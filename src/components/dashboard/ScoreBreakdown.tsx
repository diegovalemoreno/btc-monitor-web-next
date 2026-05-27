'use client'
// src/components/dashboard/ScoreBreakdown.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { IndicatorScore } from '@lib/shared/types/signal'

// Mapeamento nome PT → peso (espelha score-engine.ts, sem marketRegime/compositeSignal)
const WEIGHT: Record<string, number> = {
  'Medo & Ganância':    1.5,
  'Taxa de Funding':    1.5,
  'Variação 7d':        1,
  'Open Interest':      1.5,
  'Liq. de Longs':      1.5,
  'MVRV':               2,
  'Preço Realizado':    2,
  'Mayer Multiple':     2,
  'Hash Ribbon':        1,
  'Pressão venda':      1,
  'Médias Móveis':      1,
  'ETF Institucional':  1.5,
  'Pi Cycle Top':       1.5,
  'Bollinger %B':       1,
  'DXY (Dólar Index)':  1,
  'Long/Short Ratio':   1.5,
  'BTC Dominância':     1,
  'Heatmap Liquidações':1.5,
  'Stablecoin Ratio':   1,
}

interface ScoreBreakdownProps {
  indicators:    IndicatorScore[]
  weightedScore: number
  finalScore:    number
}

function scoreColor(s: number) {
  if (s > 0) return '#00C853'
  if (s < 0) return '#FF6D00'
  return 'var(--text-muted)'
}

export default function ScoreBreakdown({ indicators, weightedScore, finalScore }: ScoreBreakdownProps) {
  const [open, setOpen] = useState(false)

  const rows = indicators
    .filter(ind => WEIGHT[ind.name] !== undefined)
    .map(ind => ({
      name:         ind.name,
      score:        ind.score,
      weight:       WEIGHT[ind.name],
      contribution: parseFloat((ind.score * WEIGHT[ind.name]).toFixed(2)),
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '12px',
      marginBottom: '24px',
      overflow:     'hidden',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width:       '100%',
          background:  'none',
          border:      'none',
          padding:     '14px 20px',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'space-between',
          cursor:      'pointer',
          color:       'var(--text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Como o score foi calculado
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 700,
            background: 'var(--surface2)',
            border: '1px solid var(--border-dim)',
            borderRadius: '4px',
            padding: '2px 8px',
            color: 'var(--text-muted)',
          }}>
            weighted {weightedScore > 0 ? `+${weightedScore}` : weightedScore} → {finalScore}/100
          </span>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'inline-block', color: 'var(--text-muted)', fontSize: '12px' }}
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            {/* Formula explanation */}
            <div style={{
              padding: '10px 20px 14px',
              borderTop: '1px solid var(--border-dim)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              background: 'var(--surface2)',
            }}>
              <strong style={{ color: 'var(--text)' }}>Fórmula:</strong>{' '}
              cada indicador tem um score (−2 a +2) × peso (1 a 2) = contribuição.{' '}
              A soma ponderada é normalizada: <code style={{ color: 'var(--orange)', fontSize: '11px' }}>(weighted + 30) / 60 × 100</code>.{' '}
              Indicadores derivados (Regime, Sinais Compostos) não entram para evitar double-counting.
            </div>

            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 50px 70px',
              gap: '8px',
              padding: '8px 20px',
              borderTop: '1px solid var(--border-dim)',
              fontSize: '9px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}>
              <span>Indicador</span>
              <span style={{ textAlign: 'center' }}>Score</span>
              <span style={{ textAlign: 'center' }}>Peso</span>
              <span style={{ textAlign: 'right' }}>Contrib.</span>
            </div>

            {/* Rows */}
            <div style={{ borderTop: '1px solid var(--border-dim)' }}>
              {rows.map(row => (
                <div key={row.name} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 60px 50px 70px',
                  gap: '8px',
                  padding: '7px 20px',
                  borderBottom: '1px solid var(--border-dim)',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-sec)' }}>{row.name}</span>
                  <span style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: scoreColor(row.score),
                  }}>
                    {row.score > 0 ? `+${row.score}` : row.score}
                  </span>
                  <span style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                    ×{row.weight}
                  </span>
                  <span style={{
                    textAlign: 'right',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: scoreColor(row.contribution),
                  }}>
                    {row.contribution > 0 ? `+${row.contribution}` : row.contribution === 0 ? '0' : row.contribution}
                  </span>
                </div>
              ))}
            </div>

            {/* Total row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 50px 70px',
              gap: '8px',
              padding: '10px 20px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface2)',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>Total ponderado</span>
              <span />
              <span />
              <span style={{
                textAlign: 'right',
                fontSize: '14px',
                fontWeight: 900,
                color: scoreColor(weightedScore),
              }}>
                {weightedScore > 0 ? `+${weightedScore}` : weightedScore}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
