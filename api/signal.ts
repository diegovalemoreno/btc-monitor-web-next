import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runSignalEngine } from "../lib/signal-engine/pipeline";
import type { TacticalSignal } from "../lib/shared/types/signal";

// In-memory cache — protege contra burst de requests e cold starts
const CACHE_TTL_MS = 120_000; // 2 minutos
let cachedSignal: TacticalSignal | null = null;
let cachedAt = 0;

// Timeout global do pipeline — garante resposta antes do limite Vercel (10s)
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Pipeline timeout após ${ms}ms`)), ms)
    ),
  ]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=60");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const now = Date.now();
  const cacheHit = cachedSignal && now - cachedAt < CACHE_TTL_MS;

  if (cacheHit) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json(cachedSignal);
  }

  try {
    const signal = await withTimeout(runSignalEngine(), 9_000);
    cachedSignal = signal;
    cachedAt = Date.now();
    res.setHeader("X-Cache", "MISS");
    return res.status(200).json(signal);
  } catch (err) {
    // Se pipeline falhou mas temos cache expirado, retorna com aviso
    if (cachedSignal) {
      res.setHeader("X-Cache", "STALE");
      res.setHeader("X-Cache-Age", String(Math.round((now - cachedAt) / 1000)));
      return res.status(200).json(cachedSignal);
    }
    const message = err instanceof Error ? err.message : "Signal engine error";
    console.error("[API /signal]", message);
    return res.status(503).json({ error: message });
  }
}
