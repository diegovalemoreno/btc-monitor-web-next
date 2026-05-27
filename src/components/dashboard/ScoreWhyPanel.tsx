// src/components/dashboard/ScoreWhyPanel.tsx
'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TacticalScoreExplanation } from '@lib/shared/types/score-explanation'

interface Props {
  explanation: TacticalScoreExplanation
}

function contribColor(c: number) {
  if (c > 0) return '#00C853'
  if (c < 0) return '#FF6D00'
  return 'var(--text-muted)'
}

export default function ScoreWhyPanel({ explanation }: Props) {
  const [open, setOpen] = useState(false)

  const deltaSign = explanation.delta !== null && explanation.delta > 0 ? '+' : ''
  const deltaColor = explanation.delta === null ? 'var(--text-muted)'
    : explanation.delta > 0 ? '#00C853'
    : explanation.delta < 0 ? '#FF6D00'
    : 'var(--text-muted)'

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '12px',
      marginBottom: '24px',
      overflow:     'hidden',
    }}>
      {/* Header toggle */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width:          '100%',
          background:     'none',
          border:         'none',
          padding:        '14px 20px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          cursor:         'pointer',
          color:          'var(--text)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            Por que este score?
          </span>
          {/* Formula badge */}
          <span style={{
            fontSize: '10px', fontWeight: 700,
            background: 'var(--surface2)',
            border: '1px solid var(--border-dim)',
            borderRadius: '4px',
            padding: '2px 8px',
            color: 'var(--text-muted)',
          }}>
            fórmula {explanation.formulaVersion} · ponderado {explanation.weightedSum > 0 ? `+${explanation.weightedSum}` : explanation.weightedSum} → {explanation.smoothedScore}/100
          </span>
          {/* Delta badge */}
          {explanation.delta !== null && (
            <span style={{
              fontSize: '10px', fontWeight: 700,
              borderRadius: '4px',
              padding: '2px 8px',
              color: deltaColor,
              background: `${deltaColor}18`,
              border: `1px solid ${deltaColor}33`,
            }}>
              {deltaSign}{explanation.delta} vs anterior
            </span>
          )}
          {/* Warnings */}
          {explanation.warnings.length > 0 && (
            <span style={{
              fontSize: '10px', fontWeight: 600,
              color: '#FFD600',
              background: '#FFD60015',
              border: '1px solid #FFD60033',
              borderRadius: '4px',
              padding: '2px 8px',
            }}>
              ⚠ {explanation.warnings.length} aviso(s)
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'inline-block', color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}
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
              <strong style={{ color: 'var(--text)' }}>Fórmula {explanation.formulaVersion}:</strong>{' '}
              cada indicador tem score (−2 a +2) × peso (1–2) = contribuição.{' '}
              Soma ponderada normalizada:{' '}
              <code style={{ color: 'var(--orange)', fontSize: '11px' }}>(ponderado + 30) / 60 × 100</code>.{' '}
              {explanation.previousScore !== null && (
                <>Suavização aplicada: <code style={{ color: 'var(--orange)', fontSize: '11px' }}>0.7 × atual + 0.3 × anterior</code>.{' '}
                Score anterior: <strong style={{ color: 'var(--text)' }}>{explanation.previousScore}</strong> → suavizado: <strong style={{ color: 'var(--text)' }}>{explanation.smoothedScore}</strong>. </>
              )}
              Derivados excluídos para evitar double-counting.
            </div>

            {/* Warnings */}
            {explanation.warnings.length > 0 && (
              <div style={{
                padding: '8px 20px',
                borderTop: '1px solid var(--border-dim)',
                background: '#FFD60008',
              }}>
                {explanation.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: '11px', color: '#FFD600' }}>⚠ {w}</div>
                ))}
              </div>
            )}

            {/* Top contributors */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1px',
              borderTop: '1px solid var(--border-dim)',
              background: 'var(--border-dim)',
            }}>
              {/* Top positive */}
              <div style={{ background: 'var(--surface)', padding: '10px 16px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#00C853', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                  Maior contribuição positiva
                </div>
                {explanation.topPositive.map(c => (
                  <div key={c.name} style={{ marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: 'var(--text-sec)' }}>{c.name}</span>
                      <span style={{ color: '#00C853', fontWeight: 700 }}>+{c.contribution}</span>
                    </div>
                    <div style={{ height: '3px', background: 'var(--border-dim)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(c.percentOfTotal, 100)}%`, height: '100%', background: '#00C853', borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
              {/* Top negative */}
              <div style={{ background: 'var(--surface)', padding: '10px 16px' }}>
                <div style={{ fontSize: '9px', fontWeight: 700, color: '#FF6D00', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
                  Maior contribuição negativa
                </div>
                {explanation.topNegative.length === 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nenhum indicador negativo</div>
                )}
                {explanation.topNegative.map(c => (
                  <div key={c.name} style={{ marginBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                      <span style={{ color: 'var(--text-sec)' }}>{c.name}</span>
                      <span style={{ color: '#FF6D00', fontWeight: 700 }}>{c.contribution}</span>
                    </div>
                    <div style={{ height: '3px', background: 'var(--border-dim)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(c.percentOfTotal, 100)}%`, height: '100%', background: '#FF6D00', borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Full table header */}
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
              {explanation.contributions.map(row => (
                <div key={row.name} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 60px 50px 70px',
                  gap: '8px',
                  padding: '7px 20px',
                  borderBottom: '1px solid var(--border-dim)',
                  alignItems: 'center',
                  opacity: row.dataQuality === 'missing' ? 0.45 : 1,
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-sec)' }}>
                    {row.name}
                    {row.dataQuality === 'missing' && <span style={{ marginLeft: '4px', fontSize: '9px', color: 'var(--text-muted)' }}>n/d</span>}
                  </span>
                  <span style={{
                    textAlign: 'center', fontSize: '12px', fontWeight: 700,
                    color: contribColor(row.score),
                  }}>
                    {row.score > 0 ? `+${row.score}` : row.score}
                  </span>
                  <span style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                    ×{row.weight}
                  </span>
                  <span style={{
                    textAlign: 'right', fontSize: '12px', fontWeight: 700,
                    color: contribColor(row.contribution),
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
              <span /><span />
              <span style={{
                textAlign: 'right', fontSize: '14px', fontWeight: 900,
                color: contribColor(explanation.weightedSum),
              }}>
                {explanation.weightedSum > 0 ? `+${explanation.weightedSum}` : explanation.weightedSum}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
