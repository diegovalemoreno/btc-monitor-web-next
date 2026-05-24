# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a Landing Page completa do BTC Monitor como tela pública principal na rota `/`, substituindo o redirect automático para `/dashboard`.

**Architecture:** Server Component em `/` verifica auth via Supabase SSR para adaptar CTAs. Sete componentes de landing em `src/components/landing/`. Logout ajustado para redirecionar para `/`. Todos os componentes usam inline styles com CSS custom properties — padrão do projeto.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase SSR (`@/lib/supabase/server`), CSS custom properties (`var(--bg)`, `var(--orange)`, etc.), React `useState` para tabs interativas.

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `src/app/page.tsx` | Modificar | Landing Page Server Component (era redirect) |
| `src/components/shared/AppNav.tsx` | Modificar | Logout → `'/'` (era `'/login'`) |
| `src/components/landing/LandingHeader.tsx` | Criar | Nav fixo com links âncora + CTA login |
| `src/components/landing/LandingHero.tsx` | Criar | Hero centralizado com CTAs + mini mockup |
| `src/components/landing/AppPreviewTabs.tsx` | Criar | Abas interativas: Dashboard / Alertas / DCA |
| `src/components/landing/IndicatorsSection.tsx` | Criar | Lista de 10 indicadores com badge + score |
| `src/components/landing/HowItWorksSection.tsx` | Criar | 5 passos numerados do fluxo do usuário |
| `src/components/landing/DifferentialsSection.tsx` | Criar | Grid de 8 diferenciais do produto |
| `src/components/landing/LandingCTA.tsx` | Criar | CTA final com botão de login + disclaimer |

---

## Task 1: Corrigir logout redirect

**Files:**
- Modify: `src/components/shared/AppNav.tsx:22`

- [ ] **Step 1: Abrir o arquivo e localizar o redirect**

```
src/components/shared/AppNav.tsx, linha 22:
  router.push('/login')
```

- [ ] **Step 2: Alterar redirect de `/login` para `/`**

Substituir na função `handleSignOut`:

```tsx
async function handleSignOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  router.push('/')
}
```

- [ ] **Step 3: Verificar build**

```bash
npx tsc --noEmit
```

Expected: sem erros de tipo.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/AppNav.tsx
git commit -m "fix(nav): redirect to landing page on logout"
```

---

## Task 2: LandingHeader

**Files:**
- Create: `src/components/landing/LandingHeader.tsx`

O header é Client Component porque precisa do `href` dinâmico baseado em `isAuthenticated` prop.

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/landing/LandingHeader.tsx
'use client'

interface LandingHeaderProps {
  isAuthenticated: boolean
}

export default function LandingHeader({ isAuthenticated }: LandingHeaderProps) {
  return (
    <header style={{
      position:        'sticky',
      top:             0,
      zIndex:          50,
      backgroundColor: 'var(--nav-bg)',
      borderBottom:    '1px solid var(--border)',
    }}>
      <div style={{
        maxWidth:       '960px',
        margin:         '0 auto',
        padding:        '0 24px',
        height:         '52px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        {/* Brand */}
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontSize:      '12px',
            fontWeight:    700,
            letterSpacing: '0.15em',
            color:         'var(--orange)',
            textTransform: 'uppercase',
            textShadow:    'var(--brand-glow)',
          }}>
            BTC Monitor
          </span>
        </a>

        {/* Links âncora — ocultos em mobile via CSS */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {[
            { label: 'Indicadores', href: '#indicadores' },
            { label: 'Como funciona', href: '#como-funciona' },
            { label: 'App por dentro', href: '#app' },
            { label: 'Diferenciais', href: '#diferenciais' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              style={{
                padding:        '6px 10px',
                fontSize:       '13px',
                color:          'var(--text-muted)',
                textDecoration: 'none',
                borderRadius:   '6px',
                whiteSpace:     'nowrap',
              }}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {isAuthenticated ? (
            <>
              <a
                href="/dashboard"
                style={{
                  padding:         '7px 16px',
                  backgroundColor: 'var(--orange)',
                  color:           'var(--bg)',
                  border:          'none',
                  borderRadius:    '7px',
                  fontSize:        '13px',
                  fontWeight:      600,
                  textDecoration:  'none',
                  whiteSpace:      'nowrap',
                }}
              >
                Dashboard →
              </a>
            </>
          ) : (
            <a
              href="/login"
              style={{
                padding:         '7px 16px',
                backgroundColor: 'var(--orange)',
                color:           'var(--bg)',
                border:          'none',
                borderRadius:    '7px',
                fontSize:        '13px',
                fontWeight:      600,
                textDecoration:  'none',
                whiteSpace:      'nowrap',
              }}
            >
              Entrar
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/LandingHeader.tsx
git commit -m "feat(landing): add LandingHeader with auth-aware CTA"
```

---

## Task 3: LandingHero

**Files:**
- Create: `src/components/landing/LandingHero.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/landing/LandingHero.tsx

interface LandingHeroProps {
  isAuthenticated: boolean
}

export default function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const ctaHref  = isAuthenticated ? '/dashboard' : '/login'
  const ctaLabel = isAuthenticated ? 'Ir ao dashboard →' : 'Acessar o app'

  return (
    <section style={{
      padding:    '80px 24px 64px',
      textAlign:  'center',
      maxWidth:   '720px',
      margin:     '0 auto',
    }}>
      {/* Badge */}
      <div style={{
        display:         'inline-block',
        background:      'var(--orange-subtle)',
        border:          '1px solid var(--border-strong)',
        borderRadius:    '4px',
        padding:         '4px 12px',
        fontSize:        '11px',
        fontWeight:      600,
        color:           'var(--orange)',
        letterSpacing:   '0.12em',
        textTransform:   'uppercase',
        marginBottom:    '20px',
      }}>
        Bitcoin · Análise tática
      </div>

      {/* Título */}
      <h1 style={{
        fontSize:     'clamp(26px, 5vw, 40px)',
        fontWeight:   700,
        color:        'var(--text)',
        lineHeight:   1.2,
        margin:       '0 0 16px',
      }}>
        Leitura inteligente<br />do mercado Bitcoin
      </h1>

      {/* Subtítulo */}
      <p style={{
        fontSize:   '16px',
        color:      'var(--text-sec)',
        lineHeight: 1.7,
        margin:     '0 auto 32px',
        maxWidth:   '520px',
      }}>
        Indicadores organizados, alertas configuráveis e sinais históricos — tudo em um painel para acompanhar o Bitcoin com mais disciplina.
      </p>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
        <a
          href={ctaHref}
          style={{
            padding:         '12px 28px',
            backgroundColor: 'var(--orange)',
            color:           'var(--bg)',
            border:          'none',
            borderRadius:    '8px',
            fontSize:        '14px',
            fontWeight:      600,
            textDecoration:  'none',
          }}
        >
          {ctaLabel}
        </a>
        <a
          href="#indicadores"
          style={{
            padding:        '12px 28px',
            backgroundColor: 'transparent',
            color:           'var(--text-sec)',
            border:          '1px solid var(--border)',
            borderRadius:    '8px',
            fontSize:        '14px',
            textDecoration:  'none',
          }}
        >
          Ver indicadores
        </a>
      </div>

      {/* Mini mockup */}
      <div style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: '12px',
        padding:      '20px',
        textAlign:    'left',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
          Dashboard · Regime de mercado
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { label: 'Fear & Greed', value: '47', color: '#FFD600' },
            { label: 'Funding Rate', value: '+0.01%', color: '#69F0AE' },
            { label: 'MVRV Z-Score', value: '1.8', color: '#FFD600' },
            { label: '7 dias', value: '+4.2%', color: '#69F0AE' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background:   'var(--surface2)',
                border:       '1px solid var(--border-dim)',
                borderRadius: '8px',
                padding:      '12px',
              }}
            >
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/LandingHero.tsx
git commit -m "feat(landing): add LandingHero with auth-aware CTAs and mini mockup"
```

---

## Task 4: AppPreviewTabs

**Files:**
- Create: `src/components/landing/AppPreviewTabs.tsx`

Client Component com `useState` para controle da aba ativa.

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/landing/AppPreviewTabs.tsx
'use client'

import { useState } from 'react'

type Tab = 'dashboard' | 'alerts' | 'dca'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'alerts',    label: 'Alertas'   },
  { id: 'dca',       label: 'DCA'       },
]

function DashboardTab() {
  return (
    <div style={{ padding: '24px' }}>
      {/* Regime card */}
      <div style={{
        background:   'rgba(105,240,174,0.06)',
        border:       '1px solid rgba(105,240,174,0.2)',
        borderRadius: '10px',
        padding:      '18px 20px',
        marginBottom: '16px',
        display:      'flex',
        justifyContent: 'space-between',
        alignItems:   'center',
      }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Regime de mercado</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#69F0AE' }}>Neutro</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Score</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#69F0AE' }}>+2</div>
        </div>
      </div>
      {/* Dimensões */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'Sentimento', score: '+1', color: '#FFD600' },
          { label: 'Derivativos', score: '+2', color: '#69F0AE' },
          { label: 'On-chain', score: '0', color: '#b0a090' },
          { label: 'Tendência', score: '+1', color: '#69F0AE' },
        ].map(({ label, score, color }) => (
          <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border-dim)', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-sec)' }}>{label}</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color }}>{score}</span>
          </div>
        ))}
      </div>
      {/* Indicadores amostra */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[
          { name: 'Fear & Greed Index', value: '47 — Neutro', score: '+1', color: '#FFD600' },
          { name: 'Funding Rate',       value: '+0.010% — Neutro', score: '+2', color: '#69F0AE' },
          { name: 'MVRV Z-Score',       value: '1.8 — Normal', score: '0', color: '#b0a090' },
        ].map(({ name, value, score, color }) => (
          <div key={name} style={{ background: 'var(--surface2)', border: '1px solid var(--border-dim)', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text)' }}>{name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{value}</div>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 700, color }}>{score}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertsTab() {
  const ALERTS = [
    { label: 'Fear & Greed abaixo de 25', type: 'INDICATOR', severity: 'HIGH',   color: '#FF6D00', time: 'há 2h'   },
    { label: 'Funding Rate negativo',     type: 'INDICATOR', severity: 'MEDIUM', color: '#FFD600', time: 'há 6h'   },
    { label: 'Preço 7d queda > 15%',      type: 'PRICE',     severity: 'HIGH',   color: '#FF6D00', time: 'há 1d'   },
  ]
  return (
    <div style={{ padding: '24px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>
        Últimos alertas disparados
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ALERTS.map(({ label, type, severity, color, time }) => (
          <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border-dim)', borderRadius: '10px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {type} · {severity} · {time}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '16px', padding: '12px 16px', background: 'var(--orange-subtle)', border: '1px solid var(--border-strong)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-sec)' }}>
        Configure alertas para receber notificações quando os indicadores atingirem seus critérios.
      </div>
    </div>
  )
}

function DcaTab() {
  return (
    <div style={{ padding: '24px' }}>
      {/* Recomendação atual */}
      <div style={{
        background:   'rgba(105,240,174,0.06)',
        border:       '1px solid rgba(105,240,174,0.3)',
        borderRadius: '10px',
        overflow:     'hidden',
        marginBottom: '16px',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(105,240,174,0.15)' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#69F0AE', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>Recomendação atual</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#69F0AE' }}>DCA Normal</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Cadência regular</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ padding: '16px 20px', borderRight: '1px solid rgba(105,240,174,0.15)' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Aportar agora</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)' }}>R$ 700</div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Manter reserva</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-sec)' }}>R$ 300</div>
          </div>
        </div>
      </div>
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border-dim)', borderRadius: '8px', padding: '14px 16px', fontSize: '12px', color: 'var(--text-sec)', lineHeight: 1.6 }}>
        Mercado em zona neutra. Indicadores sem sinal claro de oportunidade ou risco extremo. Manter cadência regular.
      </div>
    </div>
  )
}

export default function AppPreviewTabs() {
  const [active, setActive] = useState<Tab>('dashboard')

  return (
    <section id="app" style={{ padding: '80px 24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>App por dentro</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Veja o que você encontrará</h2>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', background: 'var(--surface2)' }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              style={{
                padding:          '14px 24px',
                fontSize:         '13px',
                fontWeight:       active === id ? 600 : 400,
                color:            active === id ? 'var(--text)' : 'var(--text-muted)',
                background:       'transparent',
                border:           'none',
                borderBottom:     active === id ? '2px solid var(--orange)' : '2px solid transparent',
                cursor:           'pointer',
                transition:       'color 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {active === 'dashboard' && <DashboardTab />}
        {active === 'alerts'    && <AlertsTab />}
        {active === 'dca'       && <DcaTab />}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/AppPreviewTabs.tsx
git commit -m "feat(landing): add AppPreviewTabs with Dashboard/Alertas/DCA mocks"
```

---

## Task 5: IndicatorsSection

**Files:**
- Create: `src/components/landing/IndicatorsSection.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/landing/IndicatorsSection.tsx

interface Indicator {
  abbr:     string
  name:     string
  category: string
  desc:     string
  why:      string
  score:    string
  color:    string
}

const INDICATORS: Indicator[] = [
  {
    abbr: 'F&G', name: 'Fear & Greed Index', category: 'Sentimento',
    desc: 'Mede o sentimento predominante do mercado entre medo extremo e euforia excessiva.',
    why:  'Compras em medo extremo tendem a ser historicamente mais favoráveis do que em euforia.',
    score: '+1', color: '#FFD600',
  },
  {
    abbr: 'FR', name: 'Funding Rate', category: 'Derivativos',
    desc: 'Custo entre posições compradas e vendidas em contratos perpétuos.',
    why:  'Funding negativo pode sinalizar excesso de shorts e potencial squeeze de alta.',
    score: '+2', color: '#69F0AE',
  },
  {
    abbr: '7d', name: 'Variação em 7 dias', category: 'Tendência',
    desc: 'Variação percentual do preço do Bitcoin na última semana.',
    why:  'Quedas expressivas em curto prazo podem abrir janelas táticas de entrada.',
    score: '+1', color: '#FFD600',
  },
  {
    abbr: 'OI', name: 'Open Interest', category: 'Derivativos',
    desc: 'Volume total de contratos em aberto no mercado de derivativos.',
    why:  'OI crescente com preço caindo pode indicar pressão vendedora e risco de liquidações.',
    score: '0', color: '#b0a090',
  },
  {
    abbr: 'MV', name: 'MVRV Z-Score', category: 'On-chain',
    desc: 'Compara o valor de mercado com o valor realizado historicamente.',
    why:  'Z-score baixo historicamente coincide com fundos de ciclo e zonas de acumulação.',
    score: '+1', color: '#FFD600',
  },
  {
    abbr: 'RP', name: 'Realized Price', category: 'On-chain',
    desc: 'Preço médio estimado pelo qual os bitcoins se moveram pela última vez on-chain.',
    why:  'Preço abaixo do realized price indica que a rede está operando no prejuízo agregado.',
    score: '0', color: '#b0a090',
  },
  {
    abbr: 'HR', name: 'Hash Ribbon', category: 'Mineradores',
    desc: 'Observa médias de hash rate para identificar períodos de estresse dos mineradores.',
    why:  'Capitulação de mineradores precede historicamente recuperações de preço.',
    score: '+1', color: '#FFD600',
  },
  {
    abbr: 'PV', name: 'Pressão de venda', category: 'On-chain',
    desc: 'Indica se há aumento de oferta ou distribuição on-chain no mercado.',
    why:  'Pressão de venda elevada pode antecipar movimentos de baixa.',
    score: '0', color: '#b0a090',
  },
  {
    abbr: 'MM', name: 'Médias Móveis', category: 'Tendência',
    desc: 'Médias históricas de preço para visualizar tendência e regiões relevantes.',
    why:  'Preço próximo a médias de longo prazo pode indicar suporte ou resistência histórica.',
    score: '+1', color: '#FFD600',
  },
  {
    abbr: 'My', name: 'Meyer Multiple', category: 'On-chain',
    desc: 'Compara o preço atual com a média móvel de 200 dias.',
    why:  'Multiple abaixo de 1 historicamente aparece em zonas de compra favoráveis.',
    score: '+1', color: '#FFD600',
  },
]

function ScoreChip({ score, color }: { score: string; color: string }) {
  return (
    <div style={{
      padding:      '4px 10px',
      background:   `${color}18`,
      border:       `1px solid ${color}44`,
      borderRadius: '6px',
      fontSize:     '13px',
      fontWeight:   700,
      color,
      flexShrink:   0,
    }}>
      {score}
    </div>
  )
}

export default function IndicatorsSection() {
  return (
    <section id="indicadores" style={{ padding: '80px 24px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Indicadores</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>O que o app monitora</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0, maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Nenhum indicador sozinho determina uma boa compra. O valor está em combinar sinais de sentimento, derivativos, on-chain e tendência.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {INDICATORS.map(({ abbr, name, category, desc, why, score, color }) => (
          <div
            key={abbr}
            style={{
              background:   'var(--surface)',
              border:       '1px solid var(--border-dim)',
              borderRadius: '10px',
              padding:      '16px 20px',
              display:      'flex',
              gap:          '16px',
              alignItems:   'flex-start',
            }}
          >
            {/* Badge */}
            <div style={{
              background:    'var(--orange-subtle)',
              border:        '1px solid var(--border-strong)',
              borderRadius:  '6px',
              padding:       '6px 10px',
              fontSize:      '11px',
              fontWeight:    700,
              color:         'var(--orange)',
              flexShrink:    0,
              minWidth:      '36px',
              textAlign:     'center',
              letterSpacing: '0.05em',
            }}>
              {abbr}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{name}</span>
                <span style={{
                  fontSize:      '10px',
                  color:         'var(--text-muted)',
                  background:    'var(--surface2)',
                  border:        '1px solid var(--border-dim)',
                  borderRadius:  '4px',
                  padding:       '2px 6px',
                  whiteSpace:    'nowrap',
                }}>
                  {category}
                </span>
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--text-sec)', lineHeight: 1.5 }}>{desc}</p>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>Por que importa: {why}</p>
            </div>

            {/* Score */}
            <ScoreChip score={score} color={color} />
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/IndicatorsSection.tsx
git commit -m "feat(landing): add IndicatorsSection with 10 indicators"
```

---

## Task 6: HowItWorksSection

**Files:**
- Create: `src/components/landing/HowItWorksSection.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/landing/HowItWorksSection.tsx

const STEPS = [
  {
    n:    '01',
    title: 'Cria conta com Google',
    desc:  'Login em um clique. Sem formulário, sem senha para lembrar.',
  },
  {
    n:    '02',
    title: 'Acompanha o painel',
    desc:  'Indicadores atualizados diariamente, organizados por dimensão de mercado.',
  },
  {
    n:    '03',
    title: 'Configura seus alertas',
    desc:  'Defina critérios para Fear & Greed, Funding Rate, variação de preço e outros.',
  },
  {
    n:    '04',
    title: 'Recebe notificações',
    desc:  'Quando um alerta dispara, você é notificado por e-mail ou Telegram.',
  },
  {
    n:    '05',
    title: 'Decide manualmente',
    desc:  'O app não compra por você. Ele organiza os dados. A decisão é sempre sua.',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="como-funciona" style={{
      padding:    '80px 24px',
      maxWidth:   '960px',
      margin:     '0 auto',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>Fluxo</div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Como funciona</h2>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>
        {STEPS.map(({ n, title, desc }, i) => (
          <div
            key={n}
            style={{
              display:      'flex',
              gap:          '24px',
              alignItems:   'flex-start',
              paddingBottom: i < STEPS.length - 1 ? '32px' : '0',
            }}
          >
            {/* Number + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width:        '40px',
                height:       '40px',
                borderRadius: '50%',
                background:   'var(--orange-subtle)',
                border:       '1px solid var(--border-strong)',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                fontSize:     '12px',
                fontWeight:   700,
                color:        'var(--orange)',
                flexShrink:   0,
              }}>
                {n}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ width: '1px', flex: 1, background: 'var(--border-dim)', marginTop: '8px' }} />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingTop: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>{title}</div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-sec)', lineHeight: 1.7 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/HowItWorksSection.tsx
git commit -m "feat(landing): add HowItWorksSection with 5 steps"
```

---

## Task 7: DifferentialsSection

**Files:**
- Create: `src/components/landing/DifferentialsSection.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
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
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/DifferentialsSection.tsx
git commit -m "feat(landing): add DifferentialsSection with 8 product differentials"
```

---

## Task 8: LandingCTA

**Files:**
- Create: `src/components/landing/LandingCTA.tsx`

- [ ] **Step 1: Criar o arquivo**

```tsx
// src/components/landing/LandingCTA.tsx

interface LandingCTAProps {
  isAuthenticated: boolean
}

export default function LandingCTA({ isAuthenticated }: LandingCTAProps) {
  return (
    <section style={{
      padding:    '96px 24px',
      textAlign:  'center',
      maxWidth:   '640px',
      margin:     '0 auto',
    }}>
      <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.25 }}>
        Pronto para acompanhar o Bitcoin com dados?
      </h2>
      <p style={{ fontSize: '15px', color: 'var(--text-sec)', margin: '0 0 32px', lineHeight: 1.6 }}>
        {isAuthenticated
          ? 'Você já tem acesso. Abra o painel e acompanhe os indicadores.'
          : 'Login gratuito com Google. Sem formulário, sem senha.'}
      </p>

      <a
        href={isAuthenticated ? '/dashboard' : '/login'}
        style={{
          display:         'inline-block',
          padding:         '14px 36px',
          backgroundColor: 'var(--orange)',
          color:           'var(--bg)',
          borderRadius:    '8px',
          fontSize:        '15px',
          fontWeight:      600,
          textDecoration:  'none',
          marginBottom:    '32px',
        }}
      >
        {isAuthenticated ? 'Ir ao dashboard →' : 'Entrar com Google'}
      </a>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.7 }}>
        As informações exibidas possuem caráter educacional e analítico.<br />
        Nada neste sistema constitui recomendação financeira ou promessa de retorno.
      </p>
    </section>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/LandingCTA.tsx
git commit -m "feat(landing): add LandingCTA with auth-aware CTA and disclaimer"
```

---

## Task 9: Montar a Landing Page em `src/app/page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

Este é o único arquivo que une tudo. Server Component — busca auth, passa `isAuthenticated` para componentes que precisam.

- [ ] **Step 1: Reescrever `src/app/page.tsx`**

```tsx
// src/app/page.tsx
import { createClient } from '@/lib/supabase/server'
import LandingHeader          from '@/components/landing/LandingHeader'
import LandingHero            from '@/components/landing/LandingHero'
import AppPreviewTabs         from '@/components/landing/AppPreviewTabs'
import IndicatorsSection      from '@/components/landing/IndicatorsSection'
import HowItWorksSection      from '@/components/landing/HowItWorksSection'
import DifferentialsSection   from '@/components/landing/DifferentialsSection'
import LandingCTA             from '@/components/landing/LandingCTA'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <LandingHeader isAuthenticated={isAuthenticated} />

      <main>
        <LandingHero          isAuthenticated={isAuthenticated} />
        <AppPreviewTabs />
        <IndicatorsSection />
        <HowItWorksSection />
        <DifferentialsSection />
        <LandingCTA           isAuthenticated={isAuthenticated} />
      </main>

      <footer style={{
        borderTop:  '1px solid var(--border-dim)',
        padding:    '24px',
        textAlign:  'center',
        fontSize:   '11px',
        color:      'var(--text-muted)',
      }}>
        BTC Monitor · Dados de mercado com caráter educacional e analítico
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Rodar build**

```bash
npm run build
```

Expected: build sem erros. Todas as rotas devem aparecer na listagem final, incluindo `○ /` (agora estática/dinâmica, não mais redirect).

- [ ] **Step 3: Testar localmente**

```bash
npm run dev
```

Abrir `http://localhost:3000`:
- Deve renderizar a Landing Page completa (não redirecionar)
- Header com "Entrar" visível
- Hero com título, subtítulo, CTAs e mini mockup
- Abas interativas funcionando (Dashboard / Alertas / DCA)
- Seção de indicadores com 10 itens
- Seção "Como funciona" com 5 passos
- Seção diferenciais
- CTA final

Abrir `http://localhost:3000/dashboard` sem login:
- Deve redirecionar para `/login` (comportamento existente inalterado)

- [ ] **Step 4: Testar logout**

Com sessão ativa:
1. Fazer login
2. Navegar para `/dashboard`
3. Clicar "Sair" no AppNav
4. Confirmar que redireciona para `/` (Landing Page), não `/login`

- [ ] **Step 5: Commit final**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): replace root redirect with full Landing Page"
```

---

## Task 10: Deploy e verificação

**Files:** nenhum arquivo novo

- [ ] **Step 1: Push e deploy**

```bash
git push origin main
vercel --prod
```

- [ ] **Step 2: Verificar em produção**

Abrir `https://market-context-redesign.vercel.app`:
- Landing Page renderiza corretamente
- Botão "Entrar" funciona (vai para `/login`)
- Abas interativas funcionam (client-side)
- Logout redireciona para `/`

- [ ] **Step 3: Verificar logs**

```bash
vercel logs https://market-context-redesign.vercel.app --since 5m
```

Expected: sem erros de runtime. Rota `/` deve retornar 200.
