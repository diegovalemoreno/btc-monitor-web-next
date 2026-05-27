# Dashboard Premium Redesign — Design Spec

**Date:** 2026-05-26  
**Status:** Approved  
**Approach:** Refactor in-place (modify existing components, no parallel files)

---

## Goal

Transform the current dashboard from an organized technical grid into a premium institutional experience. User scans for 5 seconds and understands scenario, risk, opportunity, and direction — without reading individual indicators.

Reference aesthetic: Bloomberg terminal + Glassnode + fintech institucional. Not neon/cyberpunk/gamer.

---

## Decisions Made

| Decision | Choice |
|---|---|
| Hero structure | Score as protagonist — giant centered number |
| Grid hierarchy | 1 Spotlight + 2 Medium + 3 Compact |
| Spotlight card | Tendência — fixed, always |
| Medium cards | On-chain + Sentimento |
| Compact cards | Derivativos + Macro + Síntese |
| Card anatomy | Mini gauge + insight + citation quote |
| Consensus | Donut chart + legend + narrative reading |
| Implementation | Refactor in-place |

---

## Component Changes

### 1. `HeroSection.tsx` — Score as Protagonist

**Structure:**
- Full-width centered layout
- Background: `radial-gradient(ellipse 70% 120% at 50% -10%, <regime_color>13, transparent 60%)` — adapts to regime
- Secondary inner glow ring behind the number

**Content (top to bottom):**
1. Label: `OPORTUNIDADE DE ENTRADA` — 10px, uppercase, letter-spacing, `var(--orange)`
2. Score number: 88px, weight 900, color = opportunity color (`#00C853`/`#e08a3a`/`#FF1744`), `text-shadow: 0 0 80px <color>30`
3. Score sublabel: `/ 100` — 11px, muted, uppercase
4. Regime label: 18px, weight 800, `var(--text)` — e.g. "Compra Tática Moderada"
5. Price + timestamp: 13px, `var(--text-muted)` — e.g. "$103,200 · 26/05 às 08:30"
6. `signal.reading`: 12px, `var(--text-muted)`, max-width 480px, centered, line-height 1.7
7. Pills row: Risco pill (colored bg/border matching risk level) + Bias pill (neutral surface)

**Removed from hero:** `ScoreGauge` component (replaced by raw number). `ConsensusBadge` moves to new `ConsensusSection`.

**Colors:** Regime color drives glow. Opportunity score drives the number color (>60 green, >40 orange, else red).

---

### 2. `DimensionGrid.tsx` — Asymmetric Grid

**CSS Grid layout:**
```
grid-template-columns: 2fr 1fr 1fr
grid-template-rows: auto auto
```

Row 1: Spotlight (col 1, spanning full height of rows 1–2 visually but actually row 1) + Medium 1 (col 2) + Medium 2 (col 3)  
Row 2: 3 compact cards spanning full width (`grid-column: 1 / -1`, inner grid `1fr 1fr 1fr`)

**Card assignment logic** (fixed, not dynamic):
- Spotlight: group with `key === 'trend'`
- Medium: groups with `key === 'onchain'` and `key === 'sentiment'`
- Compact: groups with `key === 'derivatives'`, `key === 'macro'`, `key === 'synthesis'`
- Fallback: if a key is missing, remaining groups fill slots in order

---

### 3. `DimensionCard.tsx` — Three Variants

Accepts new prop `variant: 'spotlight' | 'medium' | 'compact'`.

#### Spotlight variant
- Left border accent (`border-left: 3px solid <color>`)
- Top gradient overlay (`linear-gradient(180deg, <color>07, transparent)`)
- Tag: `<icon> <label> · Spotlight` — 9px, muted, uppercase
- Insight: 16px, weight 800, color = group color
- Citation quote: 11px, `var(--text-muted)`, `border-left: 2px solid <color>25`, `padding-left: 10px` — uses `group.indicators[0].summary` (first indicator's summary text)
- Bottom row: score number (28px, weight 900) + progress bar + mini gauge (44px SVG)
- Expand footer: `<count> indicadores · ▾ expandir`
- Expandable indicators list: unchanged from current implementation

#### Medium variant
- Border: `1px solid rgba(255,255,255,0.04)`, top: `2px solid <color>`
- Radial glow in top-right corner: `radial-gradient(circle, <color>07, transparent 70%)`
- Tag: `<icon> <label>` — 8px, muted, uppercase
- Row: mini gauge (40px SVG, showing score as 0–100) + insight text + score/state
- Citation quote: 9px, `var(--text-muted)`, left border subtle
- Footer: score bar + `▾ ver N indicadores`
- Expandable indicators list: unchanged

**Mini gauge score mapping:** `(group.score + 10) / 20 * 100` — same formula as current progress bar, displayed in a 40px radial SVG

#### Compact variant
- Background: `var(--surface2)`, border: `1px solid var(--border-dim)`
- Single row: colored dot (6px) + label + truncated insight text + score number
- Click expands a bottom drawer (same `AnimatePresence` pattern)
- No gauge, no quote

---

### 4. `ScoreGauge.tsx` — Keep for DimensionCard internal use

Not removed — used inside `DimensionCard` variants (medium, spotlight). Remove from `HeroSection` only.

Props unchanged. Size: 44px for spotlight, 40px for medium.

---

### 5. `ConsensusBadge.tsx` → `ConsensusSection.tsx`

**Rename and expand.** Old `ConsensusBadge` removed from hero. New `ConsensusSection` is a standalone section below the dimension grid.

**Layout:** flex row, gap 24px:
1. Donut SVG (100px) — 3 arcs: bullish (green), neutro (dark gray), alerta (orange). Proportional to indicator counts. Center text: `<bullish_pct>%` + `bullish` sublabel
2. Legend: 3 rows — colored dot + name + count number
3. Vertical divider (1px, `var(--border-dim)`)
4. Narrative reading: title (`Maioria favorável` / derived from counts) + 2-line description

**Counts:** same logic as current `ConsensusBadge` (pos = score > 1, neu = −1 to 1, neg = score < −1), applied across all `groups.flatMap(g => g.indicators)`.

**Donut SVG math:**
- Total circumference = `2 * π * 38 ≈ 239`
- Each arc dasharray = `(count / total) * 239`
- Arc offsets chain: bullish starts at −90°, neutro starts after bullish, alerta after neutro

---

### 6. `InsightsPanel.tsx` — Institutional Feed

**Structure:** section with label "Observações Institucionais"

Each insight item:
- Icon circle (22px): bullish (`✓`, green bg) or warning (`⚠`, orange bg) — determined by first character or prefix of string
- Text: `font-size: 12px`, `var(--text-sec)`, `line-height: 1.6`
- First sentence bolded (split on `.` — bold up to first period)
- Separator: `border-bottom: 1px solid var(--border-dim)`, last item no border

**Icon logic:** if `insight.startsWith('✓')` or `insight.startsWith('✅')` → bull icon. If `startsWith('⚠')` or `startsWith('⚡')` → warn icon. Else → neutral dot.

The existing `insights: string[]` data is used as-is. No data model change.

---

### 7. `globals.css` — New Classes

Add:
```css
.grid-dimension {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 12px;
}

.grid-dimension-compact {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}
```

Responsive breakpoints:
- `≤960px`: `grid-dimension` → `1fr 1fr`, compact row → `1fr 1fr 1fr` (unchanged)
- `≤640px`: `grid-dimension` → `1fr`, compact row → `1fr`, spotlight drops `border-left`, uses `border-top`

---

### 8. `dashboard/page.tsx` — Wire new components

Replace `<ConsensusBadge>` import with `<ConsensusSection>`.  
Add `<ConsensusSection groups={signal.indicatorGroups} />` between `<DimensionGrid>` and `<InsightsPanel>`.  
Pass `variant` prop when rendering cards inside `DimensionGrid`.

---

## Visual Tokens (additions, no existing tokens removed)

No new CSS variables needed — all new visuals use inline `rgba(<existing_color_hex>, opacity)` or existing `var(--*)` tokens. Glow colors derived from regime/group color at runtime.

---

## Micro-interactions

- `DimensionCard` hover: `border-color` transition 0.2s (already partially implemented)
- Card compact hover: `background` transition 0.15s
- Expand/collapse: existing `AnimatePresence` + `motion.div` unchanged
- Progress bars: static (no animation on mount — avoid layout thrash)
- Hero score: static render (no counting animation — keep it fast and institutional)

---

## What Does NOT Change

- Data layer: `signal`, `indicatorGroups`, `indicators`, `insights` — zero changes
- `TacticalSignal` type and all domain logic
- `AppNav` component
- Tooltip content and behavior
- Theme system (dark/light/orange/celeste) — all new visuals use existing CSS vars
- `ScoreGauge` SVG logic — reused internally in cards

---

## Scope Boundaries

This spec covers only `src/components/dashboard/` and `src/app/globals.css`.  
Out of scope: DCA page, Alerts page, Resumo page, landing page, mobile nav.
