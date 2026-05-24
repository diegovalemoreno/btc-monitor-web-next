// src/components/landing/DifferentialsSection.tsx

const DIFFS = [
  { title: 'Foco exclusivo em Bitcoin',         desc: 'Sem ruído de altcoins. Só o que importa para quem acumula BTC.' },
  { title: 'On-chain + derivativos em um lugar', desc: 'Indicadores de redes e de futuros consolidados no mesmo painel.' },
  { title: 'Alertas configuráveis',             desc: 'Defina critérios por indicador e receba notificação quando disparar.' },
  { title: 'Leitura simples de sinais complexos', desc: 'Score de regime agrega múltiplos indicadores em uma leitura clara.' },
  { title: 'Pensado para DCA',                  desc: 'Recomendações de aporte baseadas em contexto de mercado e perfil de risco.' },
  { title: 'Histórico de recomendações',        desc: 'Acompanhe todas as recomendações anteriores para calibrar sua leitura.' },
  { title: 'Notificações por e-mail e Telegram', desc: 'Seja avisado quando um alerta disparar, sem precisar abrir o app.' },
  { title: 'Sem promessas de lucro',            desc: 'Informação educacional e analítica. A decisão final é sempre sua.' },
]

export default function DifferentialsSection() {
  return (
    <section id="diferenciais" style={{
      padding:         '80px 24px',
      backgroundColor: 'var(--surface)',
      borderTop:       '1px solid var(--border-dim)',
      borderBottom:    '1px solid var(--border-dim)',
    }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Diferenciais</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Por que o BTC Monitor</h2>
        </div>

        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap:                 '12px',
        }}>
          {DIFFS.map(({ title, desc }) => (
            <div
              key={title}
              style={{
                background:   'var(--bg)',
                border:       '1px solid var(--border-dim)',
                borderRadius: '10px',
                padding:      '20px 22px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ color: 'var(--orange)', fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>·</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>{title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
