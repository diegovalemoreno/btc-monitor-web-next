// ============================================================
// bot/notify.ts
// Roda o Signal Engine e envia resultado pro Telegram
// ============================================================

import * as dotenv from "dotenv";
dotenv.config();

import * as https from "https";
import { runSignalEngine } from "../signal-engine/pipeline";
import { buildTelegramMessage } from "../notifications/telegram-message-builder";
import { saveSnapshot } from "../history/snapshot";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const TELEGRAM_MAX_LEN = 4096;

function sendTelegramMessage(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!TOKEN || !CHAT_ID) {
      reject(new Error("TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID ausente"));
      return;
    }

    const body = JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });

    const req = https.request(
      {
        method: "POST",
        hostname: "api.telegram.org",
        path: `/bot${TOKEN}/sendMessage`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 10_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const payload = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Telegram HTTP ${res.statusCode}: ${payload}`));
            return;
          }
          resolve();
        });
        res.on("error", reject);
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout enviando msg pro Telegram"));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const signal = await runSignalEngine();
  saveSnapshot(signal);

  const html = buildTelegramMessage(signal);
  if (html.length > TELEGRAM_MAX_LEN) {
    throw new Error(
      `Mensagem HTML excede ${TELEGRAM_MAX_LEN} chars (${html.length}). Reduzir colunas.`
    );
  }
  await sendTelegramMessage(html);
  console.log("Notificação Tactical Signal enviada pro Telegram.");
}

main().catch((err) => {
  console.error("\n[ERRO NOTIFY]", err);
  process.exit(1);
});
