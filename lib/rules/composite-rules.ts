// ============================================================
// rules/composite-rules.ts
// Regras compostas nomeadas. Cada regra é uma função pura e testável.
// Prioridade de aplicação: EUPHORIA_ZONE > OVERLEVERAGED_MARKET > CAPITULATION_ZONE
// ============================================================

import { AllIndicators } from "../types/indicator";
import { TriggeredRule } from "../shared/types/signal";

export interface CompositeRuleContext {
  fearGreed: number | null;
  fundingRate: number | null;
  openInterestChangePct: number | null;
  mvrvRatio: number | null;
  mayerMultiple: number | null;
}

export function buildCompositeRuleContext(ind: AllIndicators): CompositeRuleContext {
  const get = <T>(r: { status: string; value?: T }): T | null =>
    r.status === "success" && r.value !== undefined ? r.value : null;

  const fg = get(ind.fearGreed);
  const fr = get(ind.fundingRate);
  const oi = get(ind.openInterest);
  const mv = get(ind.mvrv);
  const mm = get(ind.mayerMultiple);

  return {
    fearGreed:             fg?.fearGreedValue ?? null,
    fundingRate:           fr?.rate ?? null,
    openInterestChangePct: oi?.changePercent ?? null,
    mvrvRatio:             mv?.ratio ?? null,
    mayerMultiple:         mm?.multiple ?? null,
  };
}

// ─── CAPITULATION_ZONE ───────────────────────────────────────
// fearGreed <= 25 AND mvrvRatio < 1 AND mayerMultiple < 0.8

export function evalCapitulationZone(ctx: CompositeRuleContext): TriggeredRule | null {
  const conds: string[] = [];
  if (ctx.fearGreed !== null && ctx.fearGreed <= 25)
    conds.push(`fear&greed ${ctx.fearGreed} ≤ 25`);
  if (ctx.mvrvRatio !== null && ctx.mvrvRatio < 1)
    conds.push(`MVRV ${ctx.mvrvRatio.toFixed(2)} < 1`);
  if (ctx.mayerMultiple !== null && ctx.mayerMultiple < 0.8)
    conds.push(`Mayer ${ctx.mayerMultiple.toFixed(2)} < 0.8`);
  if (conds.length < 3) return null;
  return { name: "CAPITULATION_ZONE", reasons: conds };
}

// ─── OVERLEVERAGED_MARKET ────────────────────────────────────
// fundingRate > 0.03% AND openInterestChangePct > 8% AND fearGreed > 65

export function evalOverleveragedMarket(ctx: CompositeRuleContext): TriggeredRule | null {
  const conds: string[] = [];
  if (ctx.fundingRate !== null && ctx.fundingRate > 0.0003)
    conds.push(`funding ${(ctx.fundingRate * 100).toFixed(4)}% > 0.03%`);
  if (ctx.openInterestChangePct !== null && ctx.openInterestChangePct > 8)
    conds.push(`OI +${ctx.openInterestChangePct.toFixed(1)}% > 8%`);
  if (ctx.fearGreed !== null && ctx.fearGreed > 65)
    conds.push(`fear&greed ${ctx.fearGreed} > 65`);
  if (conds.length < 3) return null;
  return { name: "OVERLEVERAGED_MARKET", reasons: conds };
}

// ─── EUPHORIA_ZONE ───────────────────────────────────────────
// fearGreed >= 76 AND mvrvRatio > 6 AND mayerMultiple > 2.4

export function evalEuphoriaZone(ctx: CompositeRuleContext): TriggeredRule | null {
  const conds: string[] = [];
  if (ctx.fearGreed !== null && ctx.fearGreed >= 76)
    conds.push(`fear&greed ${ctx.fearGreed} ≥ 76`);
  if (ctx.mvrvRatio !== null && ctx.mvrvRatio > 6)
    conds.push(`MVRV ${ctx.mvrvRatio.toFixed(2)} > 6`);
  if (ctx.mayerMultiple !== null && ctx.mayerMultiple > 2.4)
    conds.push(`Mayer ${ctx.mayerMultiple.toFixed(2)} > 2.4`);
  if (conds.length < 3) return null;
  return { name: "EUPHORIA_ZONE", reasons: conds };
}

// ─── Avaliador agregado ──────────────────────────────────────

export function evaluateCompositeRules(ind: AllIndicators): TriggeredRule[] {
  const ctx = buildCompositeRuleContext(ind);
  return [
    evalCapitulationZone(ctx),
    evalOverleveragedMarket(ctx),
    evalEuphoriaZone(ctx),
  ].filter((r): r is TriggeredRule => r !== null);
}
