const API_URL = "/api/signal";
const $ = (id) => document.getElementById(id);

// ── Descrições educativas por indicador ───────────────────────
const TOOLTIPS = {
  "Medo & Ganância": "Mede o sentimento geral do mercado de 0 (pânico total) a 100 (euforia total).\n\nAbaixo de 25 = medo extremo — historicamente bom momento para comprar.\nAcima de 75 = euforia — risco alto de correção.\n\nQuando todos têm medo, pode ser hora de comprar. Quando todos estão eufóricos, cuidado.",

  "Taxa de Funding": "Taxa paga entre traders de futuros a cada 8 horas.\n\nPositiva e alta (>0,03%) = a maioria está alavancada comprando — mercado sobreaquecido, risco de queda brusca.\nNegativa = maioria apostando na queda — sinal de fundo, possível reversão para cima.",

  "Variação 7d": "Variação percentual do BTC nos últimos 7 dias.\n\nQuedas fortes (>10% em uma semana) costumam ser bons pontos de entrada para DCA tático.\nNão indica topo ou fundo por si só — funciona melhor em conjunto com outros sinais.",

  "Open Interest": "Valor total de contratos futuros abertos no mercado.\n\nPreço cai + OI cai forte = traders alavancados sendo liquidados (desalavancagem saudável).\nPreço sobe + OI sobe muito = mercado cada vez mais alavancado = risco aumentado.",

  "Liq. de Longs": "Volume de posições compradas forçadas a fechar por falta de margem.\n\nLiquidações massivas de longs costumam marcar fundos de curto prazo — o mercado 'limpa' posições fracas.\nAlto volume de liquidações + queda de preço = possível exaustão vendedora.",

  "MVRV": "Market Value to Realized Value — compara o valor de mercado atual com o custo médio de compra de todos os BTCs em circulação.\n\nAbaixo de 1 = a maioria dos holders está no prejuízo = zona de capitulação histórica (raro e excelente para comprar).\nAcima de 6 = maioria com lucro enorme = zona de euforia (topo histórico).",

  "Preço Realizado": "Preço médio ao qual cada BTC foi movimentado pela última vez — representa o custo médio do mercado.\n\nBTC abaixo do preço realizado = maioria dos holders está no prejuízo = oportunidade histórica muito rara.\nBTC acima = mercado em lucro médio.",

  "Mayer Multiple": "Preço atual dividido pela média móvel de 200 dias.\n\nAbaixo de 0,8 = BTC extremamente barato em relação à sua própria média histórica (ocorre poucas vezes por ciclo).\nAcima de 2,4 = extremamente caro = zona de topo de ciclo.",

  "Hash Ribbon": "Compara o poder computacional de mineração dos últimos 30 e 60 dias.\n\nQuando o hashrate cai (mineradores desligando máquinas por prejuízo) e depois volta a subir = capitulação dos mineradores terminou.\nHistoricamente um dos sinais de compra mais confiáveis após períodos de bear market.",

  "Pressão venda": "Mede a proporção de volume de venda em relação ao de compra nas exchanges.\n\nAlta pressão = grandes carteiras (whales) distribuindo BTC = sinal de cautela.\nBaixa pressão = mercado absorvendo bem, sem grandes vendedores.",

  "Médias Móveis": "Posição do preço em relação às médias de 200 dias (curto/médio prazo) e 50 semanas (longo prazo).\n\nAbaixo das duas médias = zona historicamente barata, rara em ciclos de alta.\nAcima das duas = mercado aquecido, cuidado com entradas grandes.",

  "ETF Institucional": "Monitora o volume financeiro dos 4 maiores ETFs de Bitcoin: IBIT (BlackRock), FBTC (Fidelity), GBTC (Grayscale) e ARKB.\n\nVolume muito acima da média + ETFs subindo = demanda institucional forte.\nVolume muito acima da média + ETFs caindo = instituições distribuindo.\nVolume baixo = instituições inativas, mercado sem catalisador institucional.",

  "Pi Cycle Top": "Indicador técnico que compara a média de 111 dias com o dobro da média de 350 dias.\n\nQuando a linha de 111 dias cruza ACIMA do dobro da linha de 350 dias = sinal histórico de topo de ciclo (aconteceu nos topos de 2013, 2017 e 2021).\nQuanto mais longe do cruzamento, menor o risco de topo iminente.",

  "Bollinger %B": "Mostra onde o preço está dentro das Bandas de Bollinger (faixa de volatilidade baseada em desvio padrão).\n\n0% ou abaixo = preço abaixo da banda inferior = oversold (muito vendido), historicamente bom para comprar.\n100% ou acima = preço acima da banda superior = overbought (muito comprado), cuidado com entradas.",

  "DXY (Dólar Index)": "Índice que mede a força do dólar americano contra uma cesta de moedas globais.\n\nDXY subindo = dólar fortalecendo = pressão sobre ativos de risco como BTC.\nDXY caindo = dólar enfraquecendo = ambiente favorável para BTC e outros ativos.\n\nCorrelação inversa com BTC — quando o dólar sobe, BTC tende a cair.",

  "Regime de Mercado": "Classificação geral do momento atual do mercado, derivada da combinação de todos os indicadores.\n\nCAPTULATION ZONE = zona de capitulação histórica (raríssima, excelente oportunidade).\nTACTICAL BUY = sinal de compra com força variável.\nNEUTRAL = sem sinal claro, manter DCA normal.\nRISK OFF / EXTREME RISK = cautela, reduzir exposição.\nEUPHORIA ZONE = topo de ciclo provável, não aumentar posição.",

  "Sinais Compostos": "Confluência de múltiplos indicadores extremos ao mesmo tempo.\n\nQuando vários indicadores batem limites históricos juntos (ex: medo extremo + MVRV < 1 + Mayer < 0,8), o sinal de compra é muito mais confiável do que qualquer indicador isolado.\nCAPTULATION ZONE = 3 indicadores de fundo ativos juntos.\nEUPHORIA ZONE = 3 indicadores de topo ativos juntos.",

  "Long/Short Ratio": "Proporção de traders com posições compradas (long) versus vendidas (short) na Binance Futures.\n\nRatio acima de 1,5 = mercado lotado de apostas na alta = risco elevado (posição contrária).\nRatio abaixo de 0,7 = maioria apostando na queda = sinal contrário de possível reversão para cima.\n\nMercados com todos do mesmo lado costumam surpreender na direção oposta.",

  "BTC Dominância": "Percentual do Bitcoin no valor total de todo o mercado de criptomoedas.\n\nAcima de 60% = BTC season — Bitcoin lidera o mercado, bom contexto para acumular.\nAbaixo de 45% = Alt season — altcoins outperformando, fase tardia de ciclo de alta.\nAbaixo de 40% = euforia extrema nas altcoins = provável topo de ciclo se aproximando.",

  "Stablecoin Ratio": "Compara o tamanho do mercado de stablecoins (USDT, USDC, DAI) com o market cap do Bitcoin.\n\nSSR baixo (< 4) = muito dinheiro parado em stablecoins esperando para entrar no mercado = força compradora disponível = bullish.\nSSR alto (> 10) = pouco dinheiro relativo em stablecoins = pouco combustível para subida.",
};

// ── Labels legíveis ───────────────────────────────────────────
const REGIME_LABELS = {
  "CAPITULATION_ZONE":       "Zona de Capitulação",
  "TACTICAL_BUY_AGGRESSIVE": "Compra Agressiva",
  "TACTICAL_BUY_MODERATE":   "Compra Moderada",
  "TACTICAL_BUY_LIGHT":      "Compra Leve",
  "NEUTRAL":                 "Neutro",
  "RISK_OFF":                "Risco Elevado",
  "EXTREME_RISK":            "Risco Extremo",
  "OVERLEVERAGED_MARKET":    "Mercado Alavancado",
  "EUPHORIA_ZONE":           "Zona de Euforia",
};

const BIAS_LABELS = {
  "DCA_NORMAL":              "DCA Normal",
  "TACTICAL_BUY_LIGHT":      "Acumulação Leve",
  "TACTICAL_BUY_MODERATE":   "Acumulação Moderada",
  "TACTICAL_BUY_AGGRESSIVE": "Compra Agressiva",
  "WAIT":                    "Aguardar",
  "RISK_OFF":                "Reduzir Risco",
};

// ── Utilitários ───────────────────────────────────────────────
function formatUSD(n) {
  if (n == null) return "indisponível";
  return "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) + " BRT";
}

function scoreClass(s) {
  if (s > 0) return "score-pos";
  if (s < 0) return "score-neg";
  return "score-zero";
}

function scoreLabel(s) {
  if (s > 0) return `+${s}`;
  return String(s);
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatRegime(r) {
  return REGIME_LABELS[r] || r.replace(/_/g, " ");
}

function formatBias(b) {
  return BIAS_LABELS[b] || b.replace(/_/g, " ");
}

// ── Contexto Operacional ──────────────────────────────────────
function renderContext(signal) {
  const card = $("context-card");
  card.style.setProperty("--ctx-color", `var(--regime-${signal.regime})`);

  const regimeEl = $("ctx-regime");
  regimeEl.textContent = formatRegime(signal.regime);
  regimeEl.className = `ctx-regime-value regime-${signal.regime}`;

  $("ctx-bias").innerHTML = `Viés: <strong>${formatBias(signal.actionBias)}</strong>`;

  const w = signal.score.weighted;
  $("ctx-risk").innerHTML = `Risco: <span class="risk-${signal.riskLevel}">${signal.riskLevel}</span>`;
  $("ctx-score").innerHTML = `Score: <span class="${scoreClass(w)}">${scoreLabel(w)}</span>`;
  $("ctx-price").textContent = formatUSD(signal.btcPrice);
  $("ts").textContent = formatTime(signal.generatedAt);

  const insights = signal.insights || [];
  const insightsEl = $("ctx-insights");
  if (insights.length > 0) {
    insightsEl.innerHTML = insights.map((i) => `<li>${escapeHtml(i)}</li>`).join("");
    insightsEl.style.display = "";
  } else {
    insightsEl.style.display = "none";
  }

  const reading = signal.reading || extractReading(signal.summary) || "";
  $("ctx-reading").textContent = reading;
  $("ctx-reading").style.display = reading ? "" : "none";
}

function extractReading(summary) {
  if (!summary) return "";
  const m = summary.match(/Leitura:\n([\s\S]+)/);
  return m ? m[1].trim() : summary;
}

// ── Scores Dimensionais ───────────────────────────────────────
const DIM_DEFS = [
  {
    key: "sentiment",
    label: "Sentimento",
    cap: 6,
    tooltip: "Agrega Fear & Greed, Long/Short Ratio e BTC Dominância.\n\nFavorável = medo elevado + shorts dominantes + Bitcoin liderando o mercado.\nAlerta = euforia + longs dominantes + altcoins em destaque.\n\nSentimento é contrário por natureza — extremos costumam ser sinais de reversão.",
  },
  {
    key: "derivatives",
    label: "Derivativos",
    cap: 8,
    tooltip: "Agrega Funding Rate, Open Interest, Liquidações e Stablecoin Ratio.\n\nFavorável = funding negativo + OI em queda + longs liquidados + stablecoins aguardando entrada.\nAlerta = funding muito alto + OI crescendo + mercado sobreaquecido.\n\nDerivativos refletem alavancagem acumulada — principal fator de risco de curto prazo.",
  },
  {
    key: "onchain",
    label: "On-chain",
    cap: 10,
    tooltip: "Agrega MVRV, Preço Realizado, Hash Ribbon, Pressão de Venda e ETF Institucional.\n\nFavorável = MVRV baixo + preço próximo do realizado + mineradores se recuperando + instituições comprando.\nAlerta = MVRV em zona de euforia + whales distribuindo.\n\nOn-chain revela o comportamento real dos holders de longo prazo — o dado mais difícil de falsificar.",
  },
  {
    key: "trend",
    label: "Tendência",
    cap: 10,
    tooltip: "Agrega Médias Móveis, Variação 7d, Bollinger %B, Mayer Multiple e Pi Cycle Top.\n\nFavorável = preço abaixo das médias históricas + Mayer < 0,8 + Bollinger em oversold.\nAlerta = preço muito acima das médias + Mayer > 2,4 + Pi Cycle próximo do cruzamento histórico.\n\nTendência mostra a saúde estrutural do movimento — contexto de onde o preço está no ciclo.",
  },
];

function renderDimScores(dimScores) {
  if (!dimScores) return;
  const container = $("dim-scores");

  container.innerHTML = DIM_DEFS.map(({ key, label, cap, tooltip }) => {
    const score = dimScores[key] ?? 0;
    const pct   = Math.min(50, (Math.abs(score) / cap) * 50);

    let color, status;
    if (score > 1)       { color = "var(--buy-strong)";  status = "favorável"; }
    else if (score < -1) { color = "var(--sell-strong)"; status = "alerta";    }
    else                 { color = "var(--neutral)";      status = "neutro";    }

    const fillStyle = score >= 0
      ? `left:50%;width:${pct}%;background:${color}`
      : `left:${50 - pct}%;width:${pct}%;background:${color}`;

    const sl       = score > 0 ? `+${score}` : String(score);
    const tipAttr  = tooltip ? `data-tooltip="${escapeHtml(tooltip)}"` : "";
    const tipClass = tooltip ? " has-tooltip" : "";

    return `<div class="dim-item${tipClass}" ${tipAttr} style="cursor:${tooltip ? "help" : "default"}">
      <div class="dim-label">${label}</div>
      <div class="dim-bar-track">
        <div class="dim-bar-fill" style="${fillStyle}"></div>
      </div>
      <div class="dim-footer">
        <span class="dim-status" style="color:${color}">${status}</span>
        <span class="dim-score">${sl}</span>
      </div>
    </div>`;
  }).join("");
}

// ── Indicadores Agrupados ─────────────────────────────────────
function renderIndCard(ind) {
  const tip     = TOOLTIPS[ind.name] || "";
  const tipAttr = tip ? `data-tooltip="${escapeHtml(tip)}"` : "";
  const sc       = scoreClass(ind.score);
  const sigClass = ind.score > 0 ? "sig-pos" : ind.score < 0 ? "sig-neg" : "sig-zero";
  return `<div class="ind-card ${sigClass}${tip ? " has-tooltip" : ""}" ${tipAttr}>
    <div class="ind-card-header">
      <span class="ind-card-name">${ind.name}</span>
      <span class="${sc}"><span class="score-badge">${scoreLabel(ind.score)}</span></span>
    </div>
    <div class="ind-card-summary">${ind.summary}</div>
  </div>`;
}

function renderGroupedIndicators(groups) {
  const container = $("indicators-grouped");
  if (!groups || groups.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = groups.map((group) => {
    const sc = scoreClass(group.score);
    const sl = group.score > 0 ? `+${group.score}` : String(group.score);
    const cards = group.indicators.map(renderIndCard).join("");
    return `<div class="group-section">
      <div class="group-header">
        <span class="group-label">${group.label}</span>
        <span class="${sc}"><span class="score-badge">${sl}</span></span>
      </div>
      <div class="ind-grid">${cards}</div>
    </div>`;
  }).join("");
}

// ── Playbook ──────────────────────────────────────────────────
function renderPlaybook(playbook) {
  $("playbook-allowed").innerHTML = playbook.allowed.map((x) => `<li>${x}</li>`).join("");
  $("playbook-avoid").innerHTML   = playbook.avoid.map((x) => `<li>${x}</li>`).join("");
}

// ── Render principal ──────────────────────────────────────────
function render(signal) {
  renderContext(signal);
  renderDimScores(signal.dimensionScores);
  renderGroupedIndicators(signal.indicatorGroups);
  renderPlaybook(signal.playbook);
  _lastSignal = signal;
  updateShareLinks(signal);
}

function setState(state, errorMsg) {
  $("loading").style.display   = state === "loading" ? "block" : "none";
  $("error-msg").style.display = state === "error"   ? "block" : "none";
  $("dashboard").style.display = state === "ready"   ? "block" : "none";
  if (state === "error") $("error-msg").textContent = errorMsg || "Erro desconhecido.";
}

// ── Tooltip engine ────────────────────────────────────────────
let tooltipEl = null;

function createTooltip() {
  const el = document.createElement("div");
  el.className = "tooltip-box";
  document.body.appendChild(el);
  return el;
}

function showTooltip(target, text) {
  if (!tooltipEl) tooltipEl = createTooltip();
  tooltipEl.textContent = text;
  tooltipEl.style.display = "block";
  positionTooltip(target);
}

function positionTooltip(target) {
  if (!tooltipEl) return;
  const rect = target.getBoundingClientRect();
  const tipW  = tooltipEl.offsetWidth;
  const tipH  = tooltipEl.offsetHeight;
  let left = rect.left + window.scrollX;
  let top  = rect.bottom + window.scrollY + 8;
  if (left + tipW > window.innerWidth - 12) left = window.innerWidth - tipW - 12;
  if (top + tipH > window.scrollY + window.innerHeight - 12) top = rect.top + window.scrollY - tipH - 8;
  tooltipEl.style.left = `${Math.max(8, left)}px`;
  tooltipEl.style.top  = `${top}px`;
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = "none";
}

document.addEventListener("mouseover", (e) => {
  const el = e.target.closest("[data-tooltip]");
  if (el) showTooltip(el, el.dataset.tooltip);
});
document.addEventListener("mouseout", (e) => {
  if (!e.target.closest("[data-tooltip]")) return;
  hideTooltip();
});
document.addEventListener("scroll", () => {
  const hovered = document.querySelector("[data-tooltip]:hover");
  if (hovered) positionTooltip(hovered); else hideTooltip();
}, { passive: true });

let _tapTarget = null;
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-tooltip]");
  if (el) {
    if (_tapTarget === el && tooltipEl && tooltipEl.style.display === "block") {
      hideTooltip();
      _tapTarget = null;
    } else {
      showTooltip(el, el.dataset.tooltip);
      _tapTarget = el;
    }
    e.stopPropagation();
  } else {
    hideTooltip();
    _tapTarget = null;
  }
});

// ── Share ─────────────────────────────────────────────────────
let _lastSignal = null;
const SITE_URL = "https://btc-monitor-web.vercel.app";

function buildShareText(signal) {
  const regime = formatRegime(signal.regime);
  const score  = scoreLabel(signal.score.weighted);
  const price  = formatUSD(signal.btcPrice);
  return `₿ BTC Signal Engine\nRegime: ${regime} | Score: ${score} | BTC: ${price}\n${SITE_URL}`;
}

function updateShareLinks(signal) {
  const text = buildShareText(signal);
  const wa = $("share-whatsapp");
  const tg = $("share-telegram");
  const tw = $("share-twitter");
  if (wa) wa.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
  if (tg) tg.href = `https://t.me/share/url?url=${encodeURIComponent(SITE_URL)}&text=${encodeURIComponent(text)}`;
  if (tw) tw.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

const shareBtnEl  = $("share-btn");
const shareMenuEl = $("share-menu");
const shareCopyEl = $("share-copy");

if (shareBtnEl && shareMenuEl) {
  shareBtnEl.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = shareMenuEl.classList.toggle("open");
    shareBtnEl.classList.toggle("active", open);
  });
  document.addEventListener("click", () => {
    shareMenuEl.classList.remove("open");
    shareBtnEl.classList.remove("active");
  });
}

if (shareCopyEl) {
  shareCopyEl.addEventListener("click", async () => {
    const text = _lastSignal ? buildShareText(_lastSignal) : SITE_URL;
    try {
      await navigator.clipboard.writeText(text);
      const orig = shareCopyEl.innerHTML;
      shareCopyEl.textContent = "✓  Copiado!";
      setTimeout(() => { shareCopyEl.innerHTML = orig; }, 2000);
    } catch (_) {}
  });
}

// ── Fetch ─────────────────────────────────────────────────────
async function fetchSignal() {
  const btn = $("refresh");
  btn.disabled = true;
  setState("loading");
  try {
    const res = await fetch(API_URL);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    const signal = await res.json();
    render(signal);
    setState("ready");
  } catch (err) {
    setState("error", `Falha ao carregar: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

$("refresh").addEventListener("click", fetchSignal);
fetchSignal();
