// ============================================================
// cli/html-report.ts
// Renderiza relatório como HTML compatível com Telegram.
// Telegram suporta apenas <b>, <i>, <u>, <s>, <a>, <code>, <pre>,
// <blockquote>, <tg-spoiler>. Não suporta <table> — tabela é
// renderizada em ASCII alinhado dentro de <pre>.
// ============================================================

import { gatherReport, MonitorReport } from "./index";
import { DISCLAIMER } from "../domain/recommendation";
import { IndicatorResult } from "../types/indicator";
import { formatUSD } from "../utils/date";

const LABEL_W = 17;
const PTS_W = 4;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function padRight(s: string, width: number): string {
  if (s.length >= width) return s.slice(0, width);
  return s + " ".repeat(width - s.length);
}

function padLeft(s: string, width: number): string {
  if (s.length >= width) return s.slice(0, width);
  return " ".repeat(width - s.length) + s;
}

function fmtPts(score: number | undefined, status: string): string {
  if (status !== "success" || score === undefined) return "—";
  if (score > 0) return `+${score}`;
  return String(score);
}

function cleanSummary(summary: string | undefined, status: string): string {
  if (status !== "success" || !summary) return "indisponível";
  return summary.replace(/\s*\([+-]?\d+\)\s*$/, "").trim();
}

function tableRow(label: string, r: IndicatorResult): string {
  const pts = padLeft(fmtPts(r.score, r.status), PTS_W);
  const estado = cleanSummary(r.summary, r.status);
  return `${padRight(label, LABEL_W)} ${pts}  ${estado}`;
}

function formatNowBrt(): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.format(new Date()) + " BRT";
}

export function renderHtml(report: MonitorReport): string {
  const { btcPrice, indicators, score, emoji, interpretation } = report;

  const priceLine =
    btcPrice !== null
      ? `<b>Preço BTC:</b> $${formatUSD(btcPrice)} USD`
      : `<b>Preço BTC:</b> <i>indisponível</i>`;

  const tableLines = [
    `${padRight("Indicador", LABEL_W)} ${padLeft("Pts", PTS_W)}  Estado`,
    "─".repeat(LABEL_W + 1 + PTS_W + 2 + 16),
    tableRow("Medo & Ganância",   indicators.fearGreed),
    tableRow("Taxa de Funding",   indicators.fundingRate),
    tableRow("Variação 7d",       indicators.weeklyCandle),
    tableRow("Open Interest",     indicators.openInterest),
    tableRow("Liq. de Longs",     indicators.liquidations),
    tableRow("MVRV",              indicators.mvrv),
    tableRow("Preço Realizado",   indicators.realizedPrice),
    tableRow("Mayer Multiple",    indicators.mayerMultiple),
    tableRow("Hash Ribbon",       indicators.hashRibbon),
    tableRow("Pressão venda",     indicators.sellerPressure),
    tableRow("Médias Móveis",     indicators.movingAverages),
    tableRow("Regime de Mercado", indicators.marketRegime),
    "",
    tableRow("Sinais Compostos",  indicators.compositeSignal),
  ];

  const table = `<pre>${escapeHtml(tableLines.join("\n"))}</pre>`;

  const classificationLine = `<b>Classificação:</b> ${emoji} ${escapeHtml(score.classification)}`;
  const interpretationBlock = `<b>Interpretação:</b>\n${escapeHtml(interpretation)}`;

  return [
    `<b>₿ BTC Opportunity Monitor</b>`,
    `<i>${escapeHtml(formatNowBrt())}</i>`,
    ``,
    priceLine,
    ``,
    table,
    ``,
    `<b>Score bruto:</b> ${score.rawTotal}  ·  <b>ponderado:</b> ${score.weightedTotal}`,
    classificationLine,
    ``,
    interpretationBlock,
    ``,
    `<blockquote>⚠️ ${escapeHtml(DISCLAIMER)}</blockquote>`,
  ].join("\n");
}

export async function runMonitorHtml(): Promise<string> {
  const report = await gatherReport();
  return renderHtml(report);
}
