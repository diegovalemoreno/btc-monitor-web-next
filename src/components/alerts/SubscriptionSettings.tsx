'use client'

import { useState } from 'react'
import type { AlertSubscriptionRow, RiskProfile, Severity } from '@/lib/db/types'

const PROFILES: { value: RiskProfile; label: string; desc: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservador', desc: 'Apenas alertas de alta relevância'          },
  { value: 'MODERATE',     label: 'Moderado',    desc: 'Alertas balanceados de oportunidade e risco' },
  { value: 'AGGRESSIVE',   label: 'Agressivo',   desc: 'Todos os alertas, incluindo oportunidades táticas' },
]

const SEV_RANK: Record<Severity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }

function sevFromChecks(alta: boolean, media: boolean, baixa: boolean): Severity {
  if (alta && media && baixa) return 'LOW'
  if (alta && media)          return 'MEDIUM'
  if (alta)                   return 'HIGH'
  return 'CRITICAL'
}

function checksFromSev(sev: Severity): { alta: boolean; media: boolean; baixa: boolean } {
  const rank = SEV_RANK[sev]
  return { alta: rank <= 2, media: rank <= 1, baixa: rank === 0 }
}

interface Props { initial: AlertSubscriptionRow | null }

export default function SubscriptionSettings({ initial }: Props) {
  const [profile,         setProfile]         = useState<RiskProfile>(initial?.profile       ?? 'MODERATE')
  const [enabled,         setEnabled]         = useState(initial?.enabled                    ?? true)
  const [telegramEnabled, setTelegramEnabled] = useState(initial?.telegram_enabled           ?? false)
  const [telegramChatId,  setTelegramChatId]  = useState(initial?.telegram_chat_id           ?? '')
  const [minSeverity,     setMinSeverity]     = useState<Severity>(initial?.min_severity     ?? 'MEDIUM')
  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  const { alta, media, baixa } = checksFromSev(minSeverity)

  function setPriorityCheck(level: 'alta' | 'media' | 'baixa', checked: boolean) {
    const next = {
      alta:  level === 'alta'  ? checked : alta,
      media: level === 'media' ? checked : media,
      baixa: level === 'baixa' ? checked : baixa,
    }
    setMinSeverity(sevFromChecks(next.alta, next.media, next.baixa))
  }

  async function handleSave() {
    setSaving(true); setSaved(false); setError(null)
    try {
      const res = await fetch('/api/alerts/subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          profile,
          enabled,
          telegram_enabled: telegramEnabled,
          telegram_chat_id: telegramChatId || null,
          min_severity:     minSeverity,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao salvar')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      background:   'var(--surface)',
      border:       '1px solid var(--border)',
      borderTop:    '2px solid var(--orange)',
      borderRadius: '12px',
      padding:      '24px 28px',
    }}>
      <div className="sub-settings-grid">

        {/* Column 1: Channels */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px' }}>
            Canais de notificação
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <ChannelToggle
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>}
              label="Notificações no app"
              desc="Receba alertas dentro da plataforma"
              value={enabled}
              onChange={setEnabled}
            />
            <ChannelToggle
              icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
              label="Telegram"
              desc="Receba alertas no Telegram"
              value={telegramEnabled}
              onChange={setTelegramEnabled}
            />
            {telegramEnabled && (
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '5px' }}>Chat ID</div>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={e => setTelegramChatId(e.target.value)}
                  placeholder="Ex: 123456789"
                  style={{
                    width:        '100%',
                    padding:      '7px 10px',
                    background:   'var(--bg)',
                    border:       '1px solid var(--border)',
                    borderRadius: '7px',
                    color:        'var(--text)',
                    fontSize:     '12px',
                    boxSizing:    'border-box',
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Profile */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px' }}>
            Perfil de alerta
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {PROFILES.map(({ value, label, desc }) => (
              <label key={value} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <div style={{ position: 'relative', marginTop: '2px', flexShrink: 0 }}>
                  <input
                    type="radio" name="profile" value={value}
                    checked={profile === value}
                    onChange={() => setProfile(value)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--orange)', cursor: 'pointer' }}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: profile === value ? 'var(--orange)' : 'var(--text)', marginBottom: '1px' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Column 3: Priorities */}
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '14px' }}>
            Prioridades
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PriorityCheck
              label="Alta prioridade" desc="Alertas críticos que requerem atenção imediata"
              color="#f87171" checked={alta}
              onChange={v => setPriorityCheck('alta', v)}
            />
            <PriorityCheck
              label="Média prioridade" desc="Oportunidades importantes a acompanhar"
              color="#fbbf24" checked={media}
              onChange={v => setPriorityCheck('media', v)}
            />
            <PriorityCheck
              label="Baixa prioridade" desc="Informativos e atualizações gerais"
              color="#4ade80" checked={baixa}
              onChange={v => setPriorityCheck('baixa', v)}
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding:      '10px 24px',
            background:   saving ? 'var(--orange-dim)' : 'var(--orange)',
            color:        'var(--bg)',
            border:       'none',
            borderRadius: '9px',
            fontSize:     '13px',
            fontWeight:   700,
            cursor:       saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
        {saved && <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 500 }}>✓ Configurações salvas</span>}
        {error && <span style={{ fontSize: '12px', color: '#f87171' }}>{error}</span>}
      </div>
    </div>
  )
}

// ── sub-components ──────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        position:     'relative',
        width:        '40px',
        height:       '22px',
        borderRadius: '11px',
        border:       'none',
        background:   value ? 'var(--orange)' : 'var(--text-dim)',
        cursor:       'pointer',
        flexShrink:   0,
        transition:   'background 0.2s',
      }}
    >
      <span style={{
        position:     'absolute',
        top:          '3px',
        left:         value ? '21px' : '3px',
        width:        '16px',
        height:       '16px',
        borderRadius: '50%',
        background:   'var(--surface)',
        transition:   'left 0.2s',
      }} />
    </button>
  )
}

function ChannelToggle({ icon, label, desc, value, onChange }: {
  icon: React.ReactNode; label: string; desc: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{icon}</span>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{label}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{desc}</div>
        </div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

function PriorityCheck({ label, desc, color, checked, onChange }: {
  label: string; desc: string; color: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: '14px', height: '14px', marginTop: '2px', accentColor: color, cursor: 'pointer', flexShrink: 0 }}
      />
      <div>
        <div style={{ fontSize: '12px', fontWeight: 500, color, marginBottom: '1px' }}>{label}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{desc}</div>
      </div>
    </label>
  )
}
