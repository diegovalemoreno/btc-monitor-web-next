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
        disable_web_page_preview: true,
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
