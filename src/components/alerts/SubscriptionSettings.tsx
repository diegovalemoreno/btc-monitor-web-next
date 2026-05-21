'use client'

import { useState } from 'react'
import type { AlertSubscriptionRow, RiskProfile, Severity } from '@/lib/db/types'
import Tooltip from '@/components/shared/Tooltip'

const PROFILES: { value: RiskProfile; label: string; desc: string }[] = [
  { value: 'CONSERVATIVE', label: 'Conservador', desc: 'Apenas alertas críticos — euforia, risco extremo, capitulação' },
  { value: 'MODERATE',     label: 'Moderado',    desc: 'Alertas importantes + oportunidades agressivas'             },
  { value: 'AGGRESSIVE',   label: 'Agressivo',   desc: 'Todos os alertas, incluindo janelas táticas menores'        },
]

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: 'LOW',      label: 'Baixa'    },
  { value: 'MEDIUM',   label: 'Média'    },
  { value: 'HIGH',     label: 'Alta'     },
  { value: 'CRITICAL', label: 'Crítica'  },
]

interface Props {
  initial: AlertSubscriptionRow | null
}

export default function SubscriptionSettings({ initial }: Props) {
  const [profile,         setProfile]         = useState<RiskProfile>(initial?.profile          ?? 'MODERATE')
  const [enabled,         setEnabled]         = useState(initial?.enabled                       ?? true)
  const [emailEnabled,    setEmailEnabled]    = useState(initial?.email_enabled                 ?? true)
  const [telegramEnabled, setTelegramEnabled] = useState(initial?.telegram_enabled              ?? false)
  const [telegramChatId,  setTelegramChatId]  = useState(initial?.telegram_chat_id              ?? '')
  const [minSeverity,     setMinSeverity]     = useState<Severity>(initial?.min_severity        ?? 'MEDIUM')
  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/alerts/subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          profile,
          enabled,
          email_enabled:    emailEnabled,
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
    <section style={{ marginBottom: '40px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: 600, color: '#5a5040', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px' }}>
        Configuração de alertas
      </h2>

      <div style={{ background: '#111111', border: '1px solid rgba(224,138,58,0.13)', borderRadius: '12px' }}>

        {/* Enabled toggle */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(224,138,58,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#e8e0d5' }}>Alertas ativos</div>
            <div style={{ fontSize: '12px', color: '#5a5040', marginTop: '2px' }}>Receber notificações quando condições forem atingidas</div>
          </div>
          <Toggle value={enabled} onChange={setEnabled} />
        </div>

        {/* Profile */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(224,138,58,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#b0a090' }}>Perfil de alerta</span>
            <Tooltip text="Define quais tipos de alerta você quer receber.\n\nConservador = só o essencial: euforia, risco extremo, capitulação.\nModerado = alertas importantes e oportunidades agressivas.\nAgressivo = todas as movimentações relevantes, incluindo janelas táticas menores." />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {PROFILES.map(({ value, label, desc }) => (
              <label key={value} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="profile"
                  value={value}
                  checked={profile === value}
                  onChange={() => setProfile(value)}
                  style={{ marginTop: '3px', accentColor: '#e08a3a' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#e8e0d5' }}>{label}</div>
                  <div style={{ fontSize: '12px', color: '#5a5040' }}>{desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Min severity */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(224,138,58,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#b0a090' }}>Severidade mínima</span>
            <Tooltip text="Filtro de importância dos alertas.\n\nBaixa = todos os alertas, inclusive informativos.\nMédia = alertas relevantes sem te sobrecarregar (recomendado).\nAlta = só situações sérias.\nCrítica = apenas emergências de mercado." position="left" />
          </div>
          <select
            value={minSeverity}
            onChange={(e) => setMinSeverity(e.target.value as Severity)}
            style={{
              padding:         '6px 12px',
              background:      '#161616',
              border:          '1px solid rgba(224,138,58,0.2)',
              borderRadius:    '6px',
              color:           '#e8e0d5',
              fontSize:        '13px',
              cursor:          'pointer',
            }}
          >
            {SEVERITIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Email */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(224,138,58,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#e8e0d5' }}>Notificações por e-mail</div>
            <div style={{ fontSize: '12px', color: '#5a5040', marginTop: '2px' }}>Enviado para o e-mail da sua conta Google</div>
          </div>
          <Toggle value={emailEnabled} onChange={setEmailEnabled} />
        </div>

        {/* Telegram */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: telegramEnabled ? '16px' : 0 }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#e8e0d5' }}>Telegram</div>
              <div style={{ fontSize: '12px', color: '#5a5040', marginTop: '2px' }}>Alertas via bot no Telegram</div>
            </div>
            <Toggle value={telegramEnabled} onChange={setTelegramEnabled} />
          </div>

          {telegramEnabled && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', color: '#5a5040' }}>Chat ID</label>
                <Tooltip text="Número que identifica você no Telegram. O bot precisa disso para te enviar mensagens diretamente.\n\nComo obter: abra o Telegram, inicie uma conversa com @userinfobot e ele te responde com seu Chat ID." position="right" wide />
              </div>
              <input
                type="text"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="Ex: 123456789"
                style={{
                  width:        '100%',
                  padding:      '8px 12px',
                  background:   '#161616',
                  border:       '1px solid rgba(224,138,58,0.2)',
                  borderRadius: '6px',
                  color:        '#e8e0d5',
                  fontSize:     '13px',
                  boxSizing:    'border-box',
                }}
              />
              <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#5a5040' }}>
                Inicie uma conversa com <code style={{ color: '#e08a3a' }}>@userinfobot</code> no Telegram para obter seu Chat ID.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Save */}
      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding:         '10px 24px',
            background:      saving ? 'rgba(224,138,58,0.4)' : '#e08a3a',
            color:           '#0a0a0a',
            border:          'none',
            borderRadius:    '8px',
            fontSize:        '13px',
            fontWeight:      600,
            cursor:          saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Salvando…' : 'Salvar configurações'}
        </button>
        {saved && <span style={{ fontSize: '13px', color: '#00C853' }}>✓ Salvo</span>}
        {error && <span style={{ fontSize: '13px', color: '#FF1744' }}>{error}</span>}
      </div>
    </section>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        position:        'relative',
        width:           '44px',
        height:          '24px',
        borderRadius:    '12px',
        border:          'none',
        background:      value ? '#e08a3a' : '#1e1e1e',
        cursor:          'pointer',
        flexShrink:      0,
        transition:      'background 0.2s',
      }}
    >
      <span style={{
        position:    'absolute',
        top:         '3px',
        left:        value ? '23px' : '3px',
        width:       '18px',
        height:      '18px',
        borderRadius: '50%',
        background:   '#e8e0d5',
        transition:  'left 0.2s',
      }} />
    </button>
  )
}
