# Landing Page — Design Spec

## Goal

Criar a tela principal pública do app (`/`) como uma Landing Page completa, moderna e profissional para o BTC Monitor. Substituir o redirect automático para `/dashboard` por uma página que explica o produto, mostra o app por dentro e permite login direto.

## Architecture

A rota `/` passa a ser um Server Component que verifica autenticação via Supabase server client. O CTA se adapta conforme o estado do usuário — não há redirect automático para nenhuma direção. O login continua em `/login`. O logout passa a redirecionar para `/` (em vez de `/login`).

**Tech Stack:** Next.js 16 App Router, TypeScript, CSS custom properties (sem Tailwind classes), Supabase SSR auth, React inline styles seguindo padrão existente do projeto.

---

## Routing & Auth

### `/` — Landing Page
- **Server Component** — faz `supabase.auth.getUser()` para saber se há sessão
- Usuário **não autenticado**: CTA principal "Entrar com Google" → `/login`, CTA secundário "Ver indicadores" (âncora `#indicadores`)
- Usuário **autenticado**: CTA principal "Ir ao dashboard" → `/dashboard`, header mostra email + botão de logout
- Não redireciona automaticamente em nenhum caso

### Logout
- `AppNav.tsx`: mudar `router.push('/login')` → `router.push('/')`
- Encerra sessão corretamente via `supabase.auth.signOut()`
- Usuário volta para a Landing Page com CTA de login disponível

### `/login`
- Permanece inalterado
- Acessado exclusivamente via botão/CTA na landing

---

## File Structure

### Novos arquivos
```
src/
  app/
    page.tsx                          ← substituir redirect por Landing Page
  components/
    landing/
      LandingHeader.tsx               ← nav fixo com links âncora + CTA login
      LandingHero.tsx                 ← hero centralizado
      AppPreviewTabs.tsx              ← abas interativas Dashboard/Alertas/DCA
      IndicatorsSection.tsx           ← lista de indicadores com badge + score
      HowItWorksSection.tsx           ← 5 passos do fluxo
      DifferentialsSection.tsx        ← grid de diferenciais do produto
      LandingCTA.tsx                  ← CTA final
```

### Arquivos modificados
```
src/app/page.tsx                      ← de redirect → Server Component
src/components/shared/AppNav.tsx      ← logout → '/' em vez de '/login'
```

---

## Sections (em ordem de scroll)

### 1. LandingHeader
Nav fixo no topo (`position: sticky, top: 0`).

**Elementos:**
- Logo "BTC Monitor" (laranja, uppercase, letra-spacing)
- Links âncora: `#indicadores`, `#como-funciona`, `#app`, `#diferenciais`
- Botão "Entrar" → `/login` (sempre visível, laranja, canto direito)
- Se autenticado: mostra email truncado + "Dashboard →" + "Sair"

**Visual:** `background: var(--nav-bg)`, `border-bottom: 1px solid var(--border)`, altura 52px — idêntico ao `AppNav` existente em estrutura.

---

### 2. LandingHero
Hero centralizado, acima do fold.

**Elementos:**
- Badge pill: "Bitcoin · Análise tática" (laranja, uppercase, borda sutil)
- Título H1: "Leitura inteligente do mercado Bitcoin" (22–28px, font-weight 700)
- Subtítulo: "Indicadores organizados, alertas configuráveis e sinais históricos — tudo em um painel."
- CTA primário: "Acessar o app" → `/login` (ou `/dashboard` se autenticado)
- CTA secundário: "Ver indicadores" → âncora `#indicadores`
- Mini mockup abaixo dos CTAs: 4 métricas em grid (Fear & Greed, Funding, MVRV, 7d%)

**Copy rules:** sem promessa financeira, sem "garanta lucros", sem sensacionalismo.

**Visual:** `text-align: center`, `max-width: 640px`, centralizado. Mini mockup com `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: 12px`.

---

### 3. AppPreviewTabs (id="app")
Seção "App por dentro" com abas interativas simulando navegação.

**Abas:** Dashboard | Alertas | DCA

**Dashboard tab content:**
- Card de regime (verde/amarelo/vermelho conforme score)
- Grid 3 colunas: Sentimento / Derivativos / On-chain / Tendência
- Indicadores expandidos (Fear & Greed, Funding, MVRV, Realized Price)

**Alertas tab content:**
- Lista de 2–3 alertas mockados com severidade colorida
- Badge de tipo (PRICE, INDICATOR)
- Timestamp relativo ("há 2h")

**DCA tab content:**
- Card de recomendação (ex: DCA Normal)
- Valor recomendado (ex: R$ 700)
- Racional em texto curto

**Comportamento:** Client Component com `useState` para aba ativa. Dados são estáticos (mockados) — não buscam API.

**Visual:** Container com `border: 1px solid var(--border)`, tab bar com `border-bottom`, aba ativa tem `border-bottom: 2px solid var(--orange)` e cor `var(--text)`, inativas `var(--text-muted)`.

---

### 4. IndicatorsSection (id="indicadores")
Lista vertical de indicadores com badge de abreviação + score atual + categoria.

**Cada item:**
- Badge com abreviação (ex: "F&G", "FR", "MV") — `background: var(--orange-subtle)`, `color: var(--orange)`, `border: 1px solid var(--border-strong)`
- Nome completo do indicador
- Categoria tag (Sentimento / Derivativos / On-chain / Tendência / Mineradores)
- Descrição curta (~1 linha)
- Score mockado com cor (verde positivo, amarelo neutro, vermelho negativo)

**Indicadores a incluir (10):**
1. Fear & Greed Index — Sentimento — F&G
2. Funding Rate — Derivativos — FR
3. Variação 7 dias — Tendência — 7d
4. Open Interest — Derivativos — OI
5. MVRV Z-Score — On-chain — MV
6. Realized Price — On-chain — RP
7. Hash Ribbon — Mineradores — HR
8. Pressão de venda — On-chain — PV
9. Médias Móveis — Tendência — MM
10. Meyer Multiple — On-chain — MM2

**Visual:** `display: flex, flex-direction: column, gap: 8px`. Cada item: `background: var(--surface)`, `border: 1px solid var(--border-dim)`, `border-radius: 8px`, `padding: 14px 16px`.

---

### 5. HowItWorksSection (id="como-funciona")
5 passos numerados explicando o fluxo do usuário.

**Passos:**
1. Cria conta com Google (1 clique)
2. Acompanha o painel de indicadores atualizado diariamente
3. Configura alertas para os indicadores que mais importam
4. Recebe notificações quando os alertas disparam
5. Decide manualmente se quer comprar — o app não compra por você

**Visual:** Steps em coluna com número grande laranja à esquerda (`font-size: 32px, color: var(--orange), opacity: 0.4`), título e descrição à direita. Linha divisória entre steps (`border-left: 2px solid var(--border-dim)`).

---

### 6. DifferentialsSection (id="diferenciais")
Grid de cards destacando diferenciais do produto.

**Diferenciais (8):**
1. Foco exclusivo em Bitcoin
2. Indicadores on-chain + derivativos em um painel
3. Alertas configuráveis por indicador
4. Leitura simples de sinais complexos
5. Pensado para DCA e compras táticas
6. Histórico de recomendações
7. Sem ruído de altcoins
8. Sem promessas de lucro

**Visual:** `display: grid, grid-template-columns: repeat(2, 1fr)` (mobile: 1 col). Cada card: `background: var(--surface)`, borda sutil, padding 20px, título 13px bold, descrição 12px muted.

---

### 7. LandingCTA
Seção final com call to action forte.

**Elementos:**
- Título: "Pronto para acompanhar o Bitcoin com dados?"
- Subtítulo: "Login gratuito. Sem promessas de retorno."
- Botão principal: "Entrar com Google" → `/login`
- Disclaimer: "As informações têm caráter educacional e analítico. Nada aqui constitui recomendação financeira."

**Visual:** `text-align: center`, `padding: 80px 24px`, fundo `var(--surface)` com `border-top: 1px solid var(--border)`.

---

## Design Rules

- Todas as cores via CSS custom properties (`var(--bg)`, `var(--orange)`, etc.)
- Inline styles, sem classes Tailwind (padrão do projeto)
- Sem emojis
- Responsive: max-width 960px centralizado, padding 24px lateral
- Mobile: grids colapsam para 1 coluna via `@media` ou style condicional
- Cores semânticas de mercado (verde/vermelho/amarelo) podem ser hardcoded — são significado, não UI chrome
- Sem glow excessivo, sem gradientes pesados, sem aparência de template genérico

---

## Acceptance Criteria

- [ ] `/` exibe Landing Page (não redireciona)
- [ ] Header com botão de login visível sem scroll
- [ ] Hero com título, subtítulo, CTA e mini mockup
- [ ] Abas interativas mostram Dashboard, Alertas e DCA mockados
- [ ] 10 indicadores listados com descrição e score
- [ ] Seção "Como funciona" com 5 passos
- [ ] Seção de diferenciais
- [ ] CTA final com botão de login
- [ ] Logout redireciona para `/`
- [ ] CTA adapta para usuário autenticado
- [ ] Layout responsivo (mobile funcional)
- [ ] Nenhuma promessa financeira no texto

---

## Out of Scope

- i18n (textos centralizados em componente, fácil de migrar depois)
- Animações e transições (exceto tab switch simples)
- Screenshots reais do app (substituídos por mockups em React)
- Integração com dados ao vivo na landing (mockup estático)
