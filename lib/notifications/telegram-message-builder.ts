// ============================================================
// notifications/telegram-message-builder.ts
// Formata TacticalSignal como HTML para Telegram.
// Sem regra de negócio — apenas formatação.
// Telegram suporta: <b>, <i>, <code>, <pre>, <blockquote>
// ============================================================

import { TacticalSignal, MarketRegime } from "../shared/types/signal";
import { formatUSD } from "../utils/date";

const DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━";
const LABEL_W  = 17;
const PTS_W    = 4;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function padRight(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : s + " ".repeat(w - s.length);
}

function padLeft(s: string, w: number): string {
  return s.length >= w ? s.slice(0, w) : " ".repeat(w - s.length) + s;
}

function fmtPts(score: number): string {
  return score > 0 ? `+${score}` : String(score);
}

function cleanSummary(summary: string): string {
  return summary.replace(/\s*\([+-]?\d+\)\s*$/, "").trim();
}

function formatNowBrt(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date()) + " BRT";
}

const REGIME_LABELS: Record<MarketRegime, string> = {
  CAPITULATION_ZONE:       "CAPITULATION_ZONE",
  TACTICAL_BUY_AGGRESSIVE: "TACTICAL_BUY_AGGRESSIVE",
  TACTICAL_BUY_MODERATE:   "TACTICAL_BUY_MODERATE",
  TACTICAL_BUY_LIGHT:      "TACTICAL_BUY_LIGHT",
  NEUTRAL:                 "NEUTRAL",
  RISK_OFF:                "RISK_OFF",
  EXTREME_RISK:            "EXTREME_RISK",
  OVERLEVERAGED_MARKET:    "OVERLEVERAGED_MARKET",
  EUPHORIA_ZONE:           "EUPHORIA_ZONE",
};

export function buildTelegramMessage(signal: TacticalSignal): string {
  const lines: string[] = [];
  const push = (s = "") => lines.push(s);

  // ── Header ──────────────────────────────────────────────
  push(`<b>₿ BTC Tactical Signal</b>`);
  push(`<i>${esc(formatNowBrt())}</i>`);
  push();

  if (signal.btcPrice !== null) {
    push(`<b>Preço BTC:</b> $${formatUSD(signal.btcPrice)} USD`);
  } else {
    push(`<b>Preço BTC:</b> <i>indisponível</i>`);
  }

  // ── Leitura Tática ───────────────────────────────────────
  push();
  push(DIVIDER);
  push(`🎯 <b>LEITURA TÁTICA</b>`);
  push();
  push(`<b>Regime:</b> ${esc(REGIME_LABELS[signal.regime])}`);
  push(`<b>Viés:</b> ${esc(signal.actionBias)}`);
  push(`<b>Risco:</b> ${esc(signal.riskLevel)}`);
  push(`<b>Score:</b> bruto: ${signal.score.raw} · ponderado: ${signal.score.weighted}`);
  push();
  push(`<b>Resumo:</b>`);
  push(esc(signal.summary));

  // ── Indicadores ─────────────────────────────────────────
  push();
  push(DIVIDER);
  push(`📊 <b>INDICADORES</b>`);
  push();

  const header = `${padRight("Indicador", LABEL_W)} ${padLeft("Pts", PTS_W)}  Estado`;
  const sep    = "─".repeat(LABEL_W + 1 + PTS_W + 2 + 16);
  const rows   = signal.indicators.map(
    (ind) =>
      `${padRight(ind.name, LABEL_W)} ${padLeft(fmtPts(ind.score), PTS_W)}  ${cleanSummary(ind.summary)}`
  );
  push(`<pre>${esc([header, sep, ...rows].join("\n"))}</pre>`);

  // ── Regras Disparadas ────────────────────────────────────
  push(DIVIDER);
  push(`🧩 <b>REGRAS DISPARADAS</b>`);
  push();
  if (signal.triggeredRules.length === 0) {
    push("Nenhuma regra composta disparada");
  } else {
    for (const rule of signal.triggeredRules) {
      push(`- ${esc(rule.name)}`);
    }
  }

  // ── Playbook Tático ──────────────────────────────────────
  push();
  push(DIVIDER);
  push(`✅ <b>PLAYBOOK TÁTICO</b>`);
  push();
  push("Permitido:");
  for (const item of signal.playbook.allowed) {
    push(`- ${esc(item)}`);
  }
  push();
  push("Evitar:");
  for (const item of signal.playbook.avoid) {
    push(`- ${esc(item)}`);
  }

  // ── Leitura Final ────────────────────────────────────────
  push();
  push(DIVIDER);
  push(`📌 <b>LEITURA FINAL</b>`);
  push();
  push(esc(signal.summary));
  push();
  push(`<blockquote>⚠️ Não é recomendação financeira.</blockquote>`);

  return lines.join("\n");
}
