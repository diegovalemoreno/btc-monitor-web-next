// ================================================================
// services/telegram.ts
// Sends alert notifications to Telegram via Bot API.
// Uses fetch (native in Node 18+). NO side-effects beyond HTTP.
// ================================================================

const TELEGRAM_API = 'https://api.telegram.org'
const SEND_TIMEOUT_MS = 10_000

const SEVERITY_EMOJI: Record<string, string> = {
  LOW:      'ℹ️',
  MEDIUM:   '⚠️',
  HIGH:     '🚨',
  CRITICAL: '🔴',
}

export interface TelegramResult {
  ok:     true
  chatId: string
}

export interface TelegramError {
  ok:     false
  error:  string
  chatId: string
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildAlertHtml(params: {
  title:             string
  message:           string
  severity:          string
  regime:            string
  opportunityScore:  number
  riskScore:         number
  convictionScore:   number
  appUrl:            string
}): string {
  const emoji = SEVERITY_EMOJI[params.severity] ?? '⚠️'
  const now   = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date()) + ' BRT'

  return [
    `${emoji} <b>BTC Monitor — ${esc(params.title)}</b>`,
    '',
    esc(params.message),
    '',
    '📊 <b>Contexto:</b>',
    `• Oportunidade: ${params.opportunityScore}/100`,
    `• Risco: ${params.riskScore}/100`,
    `• Convicção: ${params.convictionScore}/100`,
    `• Regime: ${esc(params.regime)}`,
    '',
    `🔗 <a href="${params.appUrl}">Ver dashboard completo</a>`,
    '',
    `<i>${esc(now)}</i>`,
    `<blockquote>⚠️ Não é recomendação financeira.</blockquote>`,
  ].join('\n')
}

export async function sendTelegramAlert(
  chatId: string,
  params: Omit<Parameters<typeof buildAlertHtml>[0], 'appUrl'> & { appUrl: string }
): Promise<TelegramResult | TelegramError> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set', chatId }

  const text = buildAlertHtml(params)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:                  chatId,
        text,
        parse_mode:               'HTML',
        disable_web_page_preview: false,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `HTTP ${res.status}: ${body}`, chatId }
    }

    return { ok: true, chatId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message, chatId }
  } finally {
    clearTimeout(timer)
  }
}

// ── DCA Recommendation format ────────────────────────────────────────────────

export interface DcaRecommendationParams {
  monthlyBrl:  number
  suggestBrl:  number
  reserveBrl:  number
  marketLabel: string
  conviction:  string
  rationale:   string
  appUrl:      string
}

const fmtBrl = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n)

function buildDcaRecommendationHtml(params: DcaRecommendationParams): string {
  const { monthlyBrl, suggestBrl, reserveBrl, marketLabel, conviction, rationale, appUrl } = params
  const emoji = marketLabel === 'Excepcional' || marketLabel === 'Favorável' ? '🟢'
    : marketLabel === 'Neutro' ? '🟡' : '🔴'

  return [
    `${emoji} <b>BTC Monitor</b>`,
    '',
    '<b>RECOMENDAÇÃO DE APORTE</b>',
    '',
    `Seu plano mensal:\n<b>${fmtBrl(monthlyBrl)}</b>`,
    '',
    `Mercado:\n<b>${esc(marketLabel)}</b>`,
    '',
    `Aporte sugerido:\n<b>${suggestBrl > 0 ? fmtBrl(suggestBrl) : 'Aguardar'}</b>`,
    '',
    `Manter reservado:\n<b>${fmtBrl(reserveBrl)}</b>`,
    '',
    `Convicção:\n<b>${esc(conviction)}</b>`,
    '',
    `Motivo:\n${esc(rationale)}`,
    '',
    `Ação:\n<a href="${appUrl}/lancamento">Registrar aporte em Lançamentos</a>`,
    '',
    `<blockquote>⚠️ Não é recomendação financeira.</blockquote>`,
  ].join('\n')
}

export async function sendTelegramDcaAlert(
  chatId: string,
  params: DcaRecommendationParams,
): Promise<TelegramResult | TelegramError> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set', chatId }

  const text = buildDcaRecommendationHtml(params)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)

  try {
    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        chat_id:                  chatId,
        text,
        parse_mode:               'HTML',
        disable_web_page_preview: false,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `HTTP ${res.status}: ${body}`, chatId }
    }

    return { ok: true, chatId }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message, chatId }
  } finally {
    clearTimeout(timer)
  }
}
