# Dashboard Redesign — Análise Tática BTC

**Data:** 2026-05-26  
**Escopo:** Reescrita completa da tela `/dashboard`  
**Objetivo:** Painel tático institucional — leitura do estado do mercado em < 5 segundos

---

## Contexto

A tela atual exibe indicadores em formato textual sem hierarquia visual. Todos os dados têm peso igual, não há narrativa, não há conclusão. O redesign transforma a tela em painel tático premium no estilo Glassnode — com hero, dimensões expansíveis e insights institucionais.

---

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Direção visual | Glassnode Premium | Hero + gauge + grid de dimensões com hierarquia clara |
| Dependências | Framer Motion + Recharts + shadcn | Animações reais, componentes premium |
| Indicadores | Score visual (gauge/barra + badge) | Dados só têm `score` + `summary` — sem séries temporais |
| Expansão de cards | Múltiplos simultâneos | Usuário precisa comparar dimensões cruzadas |
| Arquitetura | Reescrita completa (Opção A) | Enhancement cirúrgico não entrega a hierarquia pedida |
| Interatividade | Client Components para cards expansíveis | Server Component no restante |

---

## Arquitetura de componentes

```
/src/app/dashboard/page.tsx              Server Component — busca dados, passa props
/src/components/dashboard/
  HeroSection.tsx                        Server Component
  DimensionGrid.tsx                      'use client' — grid de cards expansíveis
  DimensionCard.tsx                      'use client' — card individual com Framer Motion
  InsightsPanel.tsx                      Server Component
  ScoreGauge.tsx                         Server Component — SVG puro
  ConsensusBadge.tsx                     Server Component
```

**Componentes removidos:**
- `RegimeCard.tsx` → substituído por `HeroSection`
- `DimensionScores.tsx` → absorvido pelo `HeroSection`
- `IndicatorGroups.tsx` → substituído por `DimensionGrid` + `DimensionCard`

**Fluxo de dados:**
`page.tsx` → busca `TacticalSignal` + deriva `SnapshotScores` → passa como props → Client Components recebem dados serializáveis via props (sem fetch client-side)

---

## Layout da página

```
AppNav
│
├── HeroSection
│     ├── Esquerda: regime label + BTC price + reading + consensus bar
│     └── Direita: ScoreGauge (opportunityScore) + pills (risco · viés · actionBias)
│
├── DimensionGrid  ['use client']
│     └── DimensionCard × 6  (sentiment, derivatives, onchain, trend, macro, synthesis)
│           ├── Colapsado: ícone + label + score badge + barra + chevron
│           └── Expandido (Framer Motion): lista de indicadores internos
│
└── InsightsPanel
      └── Bullets com dot colorido
```

**Grid:** `repeat(3, 1fr)` desktop → `repeat(2, 1fr)` tablet → `1fr` mobile

---

## Especificação visual

### HeroSection

- Background: `var(--surface)` com `border-left: 4px solid <regime-color>`
- Glow interno sutil: `box-shadow: inset 0 0 80px ${regimeColor}08`
- **Esquerda:**
  - Label "Análise Tática" — 11px, orange, uppercase, letter-spacing
  - Regime — 22px bold, cor do regime
  - BTC price — 32px bold, `var(--text)`
  - `signal.reading` — 13px, `var(--text-sec)`, max 2 linhas, `line-clamp-2`
  - ConsensusBadge — `N positivos · N neutros · N negativos`
- **Direita:**
  - `ScoreGauge` — SVG radial, `opportunityScore` (0–100), 80px
  - Pills horizontais: Risco (`riskLevel`) · Viés (`actionBias`) · `updatedAt`

### ScoreGauge

- SVG 80×80, dois círculos concêntricos (trilha + arco)
- Arco colorido baseado no valor: verde (>60), laranja (40–60), vermelho (<40)
- Score numérico centralizado em bold

### ConsensusBadge

- Fonte: `indicatorGroups[].indicators[]` (lista flat de todos os indicadores)
- Positivo: `score > 1` → verde
- Neutro: `-1 <= score <= 1` → muted
- Alerta: `score < -1` → laranja/vermelho
- Exibe: `6 positivos · 2 neutros · 1 alerta` com cores correspondentes

### DimensionCard (colapsado)

- `border: 1px solid var(--border-dim)` + `border-top: 3px solid <group-color>`
- Header (sempre visível):
  - Ícone emoji + label bold + score badge (valor numérico na cor do grupo)
  - Barra de score: posição entre -10 e +10, colorida pelo grupo
  - Chevron (Framer Motion rotate 0 → 180 ao expandir)
- Cursor pointer, hover: `border-color` levemente mais opaco

### DimensionCard (expandido)

- `AnimatePresence` + `motion.div` com `initial: {height: 0, opacity: 0}` → `animate: {height: 'auto', opacity: 1}`
- Duração: 200ms ease
- Lista de `IndicatorScore[]`:
  - `border-left: 2px solid ${groupColor}33`
  - Linha: nome (11px, `var(--text-sec)`) + summary (11px, `var(--text-muted)`, flex 1, truncate) + score badge colorido
  - Score badge: verde se `score > 0`, laranja se `score < 0`, muted se neutro

### InsightsPanel

- Background `var(--surface)`, border `var(--border-dim)`, border-radius 12px
- Label "Observações" — 11px, uppercase, muted
- Cada insight: dot `·` colorido (laranja) + texto 13px `var(--text-sec)`, line-height 1.6

---

## Dependências a instalar

```bash
npm install framer-motion recharts
npx shadcn@latest init
```

- **framer-motion** — `AnimatePresence` + `motion.div` nos DimensionCards (expand/collapse + chevron rotate)
- **recharts** — instalado, não usado nesta versão (sem séries temporais)
- **shadcn** — instalado, não usado nesta versão (manter `Tooltip` existente em `src/components/shared/Tooltip.tsx`)

---

## Dados disponíveis (TacticalSignal)

| Campo | Usado em |
|---|---|
| `regime` | HeroSection — label + cor |
| `btcPrice` | HeroSection — preço |
| `score.weighted` | Derivado em `opportunityScore` via `deriveSnapshotScores` |
| `riskLevel` | HeroSection — pill |
| `actionBias` | HeroSection — pill |
| `reading` | HeroSection — narrativa |
| `insights` | InsightsPanel |
| `indicatorGroups[]` | DimensionGrid → DimensionCard |
| `indicatorGroups[].indicators[]` | DimensionCard expandido |

`SnapshotScores.opportunityScore` → ScoreGauge  
`SnapshotScores.riskScore`, `euphoriaScore`, `convictionScore` → removidos do hero (simplificação — 4 gauges viram 1 gauge principal + pills)

---

## O que não muda

- `AppNav` — sem alteração
- CSS variables / design tokens — sem alteração
- Lógica de busca de dados em `page.tsx` — sem alteração
- `deriveSnapshotScores` — sem alteração

---

## Critérios de sucesso

1. Estado do mercado legível em < 5 segundos
2. Hierarquia clara: Hero > Dimensões > Detalhes > Insights
3. Cards de dimensão expansíveis com animação suave
4. Zero regressão nas outras páginas
5. TypeScript sem erros
