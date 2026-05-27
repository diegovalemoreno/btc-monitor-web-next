// ============================================================
// cli/index.ts
// Ponto de entrada da CLI — orquestra todos os adapters,
// aplica scoring contextual e interpretação.
// ============================================================

import * as dotenv from "dotenv";
dotenv.config();

import { fetchFearGreed } from "../adapters/fear-greed.adapter";
import {
  fetchBtcCurrentPrice,
  fetchWeeklyCandle,
} from "../adapters/binance-price.adapter";
import { fetchFundingRate } from "../adapters/binance-funding.adapter";
import { fetchSellerPressure } from "../adapters/seller-pressure.adapter";
import { fetchMovingAverages } from "../adapters/moving-averages.adapter";
import { fetchOpenInterest } from "../adapters/open-interest.adapter";
import { fetchRealizedPrice } from "../adapters/realized-price.adapter";
import { fetchHashRibbon } from "../adapters/hash-ribbon.adapter";
import { fetchLiquidations } from "../adapters/liquidations.adapter";
import { fetchEtfFlow } from "../adapters/etf-flows.adapter";
import { fetchPiCycle } from "../adapters/pi-cycle.adapter";
import { fetchBollinger } from "../adapters/bollinger.adapter";
import { fetchDxy } from "../adapters/dxy.adapter";
import { fetchLongShortRatio } from "../adapters/long-short-ratio.adapter";
import { fetchBtcDominance } from "../adapters/btc-dominance.adapter";
import { fetchStablecoinRatio } from "../adapters/stablecoin-ratio.adapter";
import { fetchLiquidationHeatmap } from "../adapters/liquidation-heatmap.adapter";
import { buildMvrv } from "../adapters/mvrv.adapter";
import { buildMayer } from "../adapters/mayer.adapter";

import {
  withOpenInterestContext,
  calculateTotalScore,
} from "../domain/score-engine";
import {
  getClassificationEmoji,
  DISCLAIMER,
} from "../domain/recommendation";
import { buildMarketRegime } from "../domain/market-regime";
import { buildCompositeSignal } from "../domain/composite-signals";
import {
  buildInterpretation,
  formatInterpretation,
} from "../domain/interpretation";
import { classifyRegime } from "../rules/regime-classifier";
import { evaluateCompositeRules } from "../rules/composite-rules";
import {
  AllIndicators,
  IndicatorResult,
  MvrvResult,
  MayerMultipleResult,
  ScoreResult,
  WeeklyCandleResult,
  MovingAveragesResult,
  RealizedPriceResult,
  PiCycleResult,
  BollingerResult,
  DxyResult,
  LongShortRatioResult,
  BtcDominanceResult,
  StablecoinRatioResult,
  LiquidationHeatmapResult,
} from "../types/indicator";
import { formatUSD } from "../utils/date";

const DIVIDER = "─".repeat(56);
const LABEL_WIDTH = 22;

function pad(label: string): string {
  const dots = ".".repeat(Math.max(2, LABEL_WIDTH - label.length));
  return `${label} ${dots}`;
}

function row(label: string, r: IndicatorResult): string {
  return `  ${pad(label)} ${r.summary ?? r.status}`;
}

function priceUnavailable<T extends IndicatorResult>(
  base: Omit<T, "status" | "score" | "summary"> & Partial<T>,
  label: string
): T {
  return {
    ...(base as object),
    status: "error",
    score: 0,
    summary: `indisponível (0) — preço indisponível`,
    error: `${label}: preço indisponível`,
  } as T;
}

export interface MonitorReport {
  btcPrice: number | null;
  indicators: AllIndicators;
  score: ScoreResult;
  emoji: string;
  interpretation: string;
}

export async function gatherReport(): Promise<MonitorReport> {
  const btcPrice = await fetchBtcCurrentPrice();
  const priceForCalc = btcPrice ?? 0;

  const [
    fearGreed,
    weeklyCandle,
    fundingRate,
    sellerPressure,
    movingAverages,
    openInterest,
    realizedPrice,
    hashRibbon,
    liquidations,
    etfFlow,
    piCycle,
    bollinger,
    dxy,
    longShortRatio,
    btcDominance,
    stablecoinRatio,
    liquidationHeatmap,
  ] = await Promise.all([
    fetchFearGreed(),
    priceForCalc > 0
      ? fetchWeeklyCandle(priceForCalc)
      : Promise.resolve(priceUnavailable<WeeklyCandleResult>({}, "Variação semanal")),
    fetchFundingRate(),
    fetchSellerPressure(),
    priceForCalc > 0
      ? fetchMovingAverages(priceForCalc)
      : Promise.resolve(priceUnavailable<MovingAveragesResult>({}, "Médias Móveis")),
    fetchOpenInterest(),
    priceForCalc > 0
      ? fetchRealizedPrice(priceForCalc)
      : Promise.resolve(priceUnavailable<RealizedPriceResult>({}, "Preço Realizado")),
    fetchHashRibbon(),
    fetchLiquidations(),
    fetchEtfFlow(),
    priceForCalc > 0
      ? fetchPiCycle(priceForCalc)
      : Promise.resolve(priceUnavailable<PiCycleResult>({}, "Pi Cycle Top")),
    priceForCalc > 0
      ? fetchBollinger(priceForCalc)
      : Promise.resolve(priceUnavailable<BollingerResult>({}, "Bollinger %B")),
    fetchDxy(),
    fetchLongShortRatio(),
    fetchBtcDominance(),
    fetchStablecoinRatio(),
    priceForCalc > 0
      ? fetchLiquidationHeatmap(priceForCalc)
      : Promise.resolve<LiquidationHeatmapResult>({
          status: "error",
          score: 0,
          summary: "indisponível (0) — preço indisponível",
          error: "preço indisponível",
        }),
  ]);

  // MVRV é derivado: price atual / realized price (sem nova chamada de API)
  let mvrv: MvrvResult;
  if (realizedPrice.status === "success" && realizedPrice.value && priceForCalc > 0) {
    mvrv = buildMvrv(priceForCalc, realizedPrice.value.realizedPrice);
  } else {
    mvrv = {
      status: "error",
      score: 0,
      summary: "indisponível (0) — depende de preço e preço realizado",
      error: "Inputs indisponíveis pra MVRV",
    };
  }

  // Mayer Multiple é derivado: price atual / MM200d (sem nova chamada de API)
  let mayerMultiple: MayerMultipleResult;
  if (movingAverages.status === "success" && movingAverages.value && priceForCalc > 0) {
    mayerMultiple = buildMayer(priceForCalc, movingAverages.value.ma200d);
  } else {
    mayerMultiple = {
      status: "error",
      score: 0,
      summary: "indisponível (0) — depende de preço e MM200d",
      error: "Inputs indisponíveis pra Mayer Multiple",
    };
  }

  // Indicators parcial pra alimentar derivações
  const indicators: AllIndicators = {
    btcPrice,
    fearGreed,
    weeklyCandle,
    fundingRate,
    sellerPressure,
    movingAverages,
    openInterest,
    mvrv,
    realizedPrice,
    hashRibbon,
    mayerMultiple,
    liquidations,
    etfFlow,
    piCycle,
    bollinger,
    dxy,
    longShortRatio,
    btcDominance,
    stablecoinRatio,
    liquidationHeatmap,
    marketRegime: { status: "unknown", score: 0 },
    compositeSignal: { status: "unknown", score: 0 },
  };

  // Aplica scoring contextual de OI (cruza preço + funding) — pura, sem mutação
  indicators.openInterest = withOpenInterestContext(indicators);

  // Deriva regime e composite signals
  indicators.marketRegime = buildMarketRegime(indicators);
  indicators.compositeSignal = buildCompositeSignal(indicators);

  const score = calculateTotalScore(indicators);
  const emoji = getClassificationEmoji(score.classification);

  const triggeredRules = evaluateCompositeRules(indicators);
  const regimeClassified = classifyRegime(score.weightedTotal, triggeredRules);
  const compositeKind = indicators.compositeSignal.value?.kind ?? "none";

  const interpretation = formatInterpretation(
    buildInterpretation(indicators, score, regimeClassified, compositeKind)
  );

  return { btcPrice, indicators, score, emoji, interpretation };
}

export async function runMonitor(): Promise<string> {
  const { btcPrice, indicators, score, emoji, interpretation } =
    await gatherReport();

  const lines: string[] = [];
  const push = (s: string = "") => lines.push(s);

  push();
  push(DIVIDER);
  push("  ₿  BTC Opportunity Monitor");
  push(DIVIDER);

  if (btcPrice !== null) {
    push(`  Preço BTC: $${formatUSD(btcPrice)} USD`);
  } else {
    push(`  Preço BTC: indisponível — falha ao buscar preço`);
  }

  push(DIVIDER);
  push("  INDICADORES");
  push();
  push(row("Medo & Ganância",       indicators.fearGreed));
  push(row("Taxa de Funding",       indicators.fundingRate));
  push(row("Variação semanal",      indicators.weeklyCandle));
  push(row("Open Interest",         indicators.openInterest));
  push(row("Liquidações de Longs",  indicators.liquidations));
  push(row("MVRV",                  indicators.mvrv));
  push(row("Preço Realizado",       indicators.realizedPrice));
  push(row("Mayer Multiple",        indicators.mayerMultiple));
  push(row("Hash Ribbon",           indicators.hashRibbon));
  push(row("Pressão vendedora",     indicators.sellerPressure));
  push(row("Médias Móveis",         indicators.movingAverages));
  push(row("ETF Institucional",     indicators.etfFlow));
  push(row("Pi Cycle Top",          indicators.piCycle));
  push(row("Bollinger %B",          indicators.bollinger));
  push(row("DXY (Dólar Index)",     indicators.dxy));
  push(row("Long/Short Ratio",      indicators.longShortRatio));
  push(row("BTC Dominância",        indicators.btcDominance));
  push(row("Stablecoin Ratio",      indicators.stablecoinRatio));
  push(row("Heatmap Liquidações",   indicators.liquidationHeatmap));
  push(row("Regime de Mercado",     indicators.marketRegime));
  push();
  push(row("Sinais Compostos",      indicators.compositeSignal));

  push();
  push(DIVIDER);
  push(`  Score bruto:      ${score.rawTotal}`);
  push(`  Score ponderado:  ${score.weightedTotal}`);
  push(DIVIDER);
  push(`\n  Classificação:`);
  push(`  ${emoji}  ${score.classification}\n`);

  push(DIVIDER);
  push("\n  Interpretação:");
  for (const line of interpretation.split("\n")) {
    push(`  ${line}`);
  }
  push();

  push(DIVIDER);
  push("\n⚠️  Observação:");
  push(`   ${DISCLAIMER}\n`);

  return lines.join("\n");
}

async function main() {
  const report = await runMonitor();
  console.log(report);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("\n[ERRO FATAL]", err);
    process.exit(1);
  });
}
