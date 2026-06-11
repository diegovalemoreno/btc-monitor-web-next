// ================================================================
// services/email.ts
// Sends alert notifications via Resend REST API.
// No SDK dependency — uses fetch directly.
// ================================================================

const RESEND_API = 'https://api.resend.com/emails'

export interface EmailResult {
  ok:    true
  to:    string
}

export interface EmailError {
  ok:    false
  error: string
  to:    string
}

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      '#b0a090',
  MEDIUM:   '#FFD600',
  HIGH:     '#FF6D00',
  CRITICAL: '#FF1744',
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
  const color = SEVERITY_COLOR[params.severity] ?? '#e08a3a'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e8e0d5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#111111;border:1px solid rgba(224,138,58,0.13);border-radius:12px;overflow:hidden;">

        <!-- Header -->
        <tr><td style="padding:24px 32px;border-bottom:1px solid rgba(224,138,58,0.1);">
          <div style="font-size:11px;font-weight:600;letter-spacing:0.15em;color:#e08a3a;text-transform:uppercase;margin-bottom:4px;">BTC Monitor</div>
          <div style="font-size:18px;font-weight:700;color:#e8e0d5;">${escHtml(params.title)}</div>
          <div style="margin-top:8px;display:inline-block;padding:3px 10px;background:${color}22;border:1px solid ${color}55;border-radius:4px;font-size:11px;font-weight:600;color:${color};text-transform:uppercase;">${escHtml(params.severity)}</div>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#b0a090;">${escHtml(params.message)}</p>

          <!-- Scores -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${scoreRow('Oportunidade', params.opportunityScore, '#00C853')}
            ${scoreRow('Risco', params.riskScore, '#FF6D00')}
            ${scoreRow('Convicção', params.convictionScore, '#e08a3a')}
          </table>

          <div style="padding:12px 16px;background:#161616;border-radius:8px;font-size:12px;color:#5a5040;">
            Regime: <span style="color:#b0a090;">${escHtml(params.regime)}</span>
          </div>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 24px;">
          <a href="${params.appUrl}/analise-tatica" style="display:inline-block;padding:12px 24px;background:#e08a3a;color:#0a0a0a;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;">
            Ver Análise Tática
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid rgba(224,138,58,0.1);font-size:11px;color:#5a5040;line-height:1.6;">
          As informações possuem caráter educacional e analítico. Nada aqui constitui recomendação financeira.
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function scoreRow(label: string, value: number, color: string): string {
  const pct = Math.min(100, Math.max(0, value))
  return `
    <tr>
      <td style="padding:4px 0;font-size:12px;color:#5a5040;width:110px;">${escHtml(label)}</td>
      <td style="padding:4px 0;">
        <div style="background:#1e1e1e;border-radius:4px;height:6px;overflow:hidden;">
          <div style="background:${color};width:${pct}%;height:6px;border-radius:4px;"></div>
        </div>
      </td>
      <td style="padding:4px 0 4px 12px;font-size:12px;color:#b0a090;width:40px;text-align:right;">${value}</td>
    </tr>`
}

export async function sendEmailAlert(
  to: string,
  params: {
    title:             string
    message:           string
    severity:          string
    regime:            string
    opportunityScore:  number
    riskScore:         number
    convictionScore:   number
    appUrl:            string
  }
): Promise<EmailResult | EmailError> {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.ALERT_EMAIL_FROM ?? 'BTC Monitor <alerts@btcmonitor.app>'

  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set', to }

  const html = buildAlertHtml(params)

  try {
    const res = await fetch(RESEND_API, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to:      [to],
        subject: `[BTC Monitor] ${params.title}`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Resend HTTP ${res.status}: ${body}`, to }
    }

    return { ok: true, to }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message, to }
  }
}
