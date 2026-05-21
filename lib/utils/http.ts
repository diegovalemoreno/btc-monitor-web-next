// ============================================================
// utils/http.ts
// Wrapper HTTP usando módulo nativo do Node.js (https/http)
// Compatível com qualquer versão do Node — sem fetch global
// ============================================================

import * as https from "https";
import * as http from "http";
import { URL } from "url";

const DEFAULT_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS) || 8000;
const DEFAULT_RETRIES    = Number(process.env.HTTP_RETRIES) || 1;
const RETRY_BACKOFF_MS   = 400;

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
}

function singleFetch<T>(urlString: string, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const transport = url.protocol === "https:" ? https : http;

    const req = transport.get(
      urlString,
      {
        headers: {
          "User-Agent": "btc-opportunity-monitor/1.0",
          Accept: "application/json",
        },
        timeout: timeoutMs,
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(
            new Error(
              `HTTP ${res.statusCode}: ${res.statusMessage} — ${urlString}`
            )
          );
          res.resume();
          return;
        }

        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf8");
            resolve(JSON.parse(body) as T);
          } catch (err) {
            reject(new Error(`Falha ao parsear JSON de ${urlString}: ${err}`));
          }
        });
        res.on("error", reject);
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout após ${timeoutMs}ms — ${urlString}`));
    });

    req.on("error", reject);
  });
}

function shouldRetry(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  // Não retry em 4xx (client error definitivo). Retry em timeout, network, 5xx.
  if (/HTTP 4\d{2}/.test(msg)) return false;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchJson<T>(
  urlString: string,
  optionsOrTimeout: FetchOptions | number = {}
): Promise<T> {
  const opts: FetchOptions =
    typeof optionsOrTimeout === "number"
      ? { timeoutMs: optionsOrTimeout }
      : optionsOrTimeout;

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.retries ?? DEFAULT_RETRIES;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await singleFetch<T>(urlString, timeoutMs);
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries || !shouldRetry(err)) break;
      await sleep(RETRY_BACKOFF_MS * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
