'use client'

export default function DcaEducationalNotice() {
  return (
    <div style={{
      padding:      '16px 20px',
      background:   'var(--surface2)',
      border:       '1px solid var(--border-dim)',
      borderRadius: '10px',
      display:      'flex',
      gap:          '12px',
      alignItems:   'flex-start',
      marginBottom: '24px',
    }}>
      <span style={{ fontSize: '14px', color: 'var(--text-muted)', flexShrink: 0, marginTop: '1px' }}>⚠</span>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.65 }}>
        <p style={{ margin: '0 0 8px' }}>
          <strong style={{ color: 'var(--text-sec)' }}>DCA Tático rastreia apenas o caixa tático</strong> — a parcela do aporte mensal reservada para janelas de oportunidade. O DCA estrutural (aporte fixo recorrente) é executado por você separado, independente de qualquer score.
        </p>
        <p style={{ margin: '0 0 8px' }}>
          <strong style={{ color: 'var(--text-sec)' }}>DCA Intelligence é um sistema separado</strong> — gera recomendação diária (aguardar / DCA normal / reforçado / agressivo) com base no snapshot de mercado. Não reflete aportes que você lançou aqui; ele responde ao mercado, não ao seu histórico.
        </p>
        <p style={{ margin: 0 }}>
          Nenhum sistema pode garantir lucro ou antecipar fundos de mercado. Scores e alocações são orientações — a decisão final é sempre sua.
        </p>
      </div>
    </div>
  )
}
