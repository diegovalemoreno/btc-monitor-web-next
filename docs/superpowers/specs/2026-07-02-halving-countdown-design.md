# Halving Countdown Section — Landing Page

**Date:** 2026-07-02
**Scope:** New animated digital countdown to next Bitcoin halving, on the public landing page (`/`)

---

## Summary

Add a dedicated section to the landing page showing a live, ticking countdown (DD:HH:MM:SS) to the next Bitcoin halving. The estimated date is derived from the current block height (fetched from mempool.space) rather than hardcoded, consistent with the project's existing "honest data" approach in `btc-mining`/`sth-lth-prices`.

Two deliverables:

1. **New `/api/btc-halving` route** — fetches current block height from mempool.space, computes blocks remaining until the next halving block and an estimated date.
2. **New `HalvingCountdown` component** — client component placed between `LandingHero` and `AppPreviewTabs` on the landing page. Fetches the estimate, then ticks the countdown locally every second.

---

## 1. API Route — `/api/btc-halving`

**File:** `src/app/api/btc-halving/route.ts`

**Data source:** `https://mempool.space/api/blocks/tip/height` (plain-text current block height), same host already used by `/api/btc-mining`.

**Halving math:**
- Halvings occur every 210,000 blocks. Most recent halving: block 840,000 (April 2024).
- Next halving block: `840000 + 210000 = 1050000`.
- `remainingBlocks = max(0, 1050000 - currentHeight)`
- `estimatedSeconds = remainingBlocks * 600` (10 min average block time)
- `estimatedDate = now + estimatedSeconds`
- `epochProgressPct = clamp(((currentHeight - 840000) / 210000) * 100, 0, 100)`

**Caching:** `next: { revalidate: 300 }` (5 min), matching `btc-mining`.

**Response shape:**
```typescript
{
  currentHeight:     number
  nextHalvingBlock:  number   // 1050000
  remainingBlocks:   number
  estimatedDate:     string   // ISO 8601
  epochProgressPct:  number   // 0-100
}
```

**Error handling:** on fetch failure or non-OK response, return `503` with `{ error: string }` — no fabricated fallback date. Matches existing pattern in `btc-mining/route.ts`.

---

## 2. Component — `HalvingCountdown`

**File:** `src/components/landing/HalvingCountdown.tsx` (`'use client'`)

**Data flow:**
- On mount, `fetch('/api/btc-halving')`.
- Store `estimatedDate` (and `remainingBlocks`, `currentHeight`) in state.
- `setInterval(1000)` computes `diff = estimatedDate - Date.now()` and derives `{ days, hours, minutes, seconds }` for display — ticks locally, no per-second network calls.
- Re-fetch the API every 5 minutes (`setInterval(300_000)`) to self-correct drift as real block time varies from the 10-min average — same revalidate window as the route.
- Clear both intervals on unmount.

**States:**
- **Loading** (before first fetch resolves): render the same layout with `--` placeholders in each digit group, no layout shift once data arrives.
- **Loaded**: ticking digital countdown.
- **Error** (fetch failed / 503): render a compact fallback message ("Estimativa indisponível no momento") instead of the countdown — no fake numbers, no thrown error.

**Visual design** (matches existing landing components — inline styles, CSS custom properties, no new dependencies):
- Section wrapper same padding/max-width rhythm as `IndicatorsSection` (`padding: 80px 24px`, centered content).
- Eyebrow label "Próximo Halving" in `var(--orange)`, uppercase, same treatment as other section eyebrows.
- Four digit groups (Dias / Horas / Min / Seg) as cards styled like the Hero's mini-mockup stat tiles (`var(--surface2)` background, `var(--border-dim)` border, `border-radius: 8px`), each showing a large monospace number (`font-variant-numeric: tabular-nums` to avoid width jitter as digits change) and a small muted label underneath.
- Below the digit row: a thin subtext line with the estimated date (formatted `pt-BR`, e.g. "≈ 15 de abril de 2028") and blocks remaining, e.g. "Faltam 42.318 blocos até o bloco 1.050.000".
- No new colors/tokens — reuse `--orange`, `--surface`, `--surface2`, `--border`, `--border-dim`, `--text`, `--text-sec`, `--text-muted` as used elsewhere.
- "Animation" = the ticking numbers themselves (update each second); no canvas/SVG clock face, no external animation library.

---

## 3. Landing Page Integration

**File:** `src/app/page.tsx`

Insert `<HalvingCountdown />` between `<LandingHero />` and `<AppPreviewTabs />`:

```tsx
<LandingHero          isAuthenticated={isAuthenticated} />
<HalvingCountdown />
<AppPreviewTabs />
```

---

## Out of Scope

- No analog clock face / SVG hands.
- No persistence of the block height / estimate (always live-fetched, no DB write).
- No changes to `btc-mining` route (halving math is independent, even though both hit mempool.space).
- No i18n — Portuguese strings only, matching rest of landing page.

---

## Testing

- `curl localhost:3000/api/btc-halving` returns valid JSON with plausible `remainingBlocks` (currently in the hundreds of thousands) and a future `estimatedDate`.
- Load `/` unauthenticated in browser: countdown renders, seconds digit changes every ~1s, no layout shift.
- Simulate route failure (e.g. temporarily throw in the route): landing page still renders, fallback message shown, no console error boundary trip.
