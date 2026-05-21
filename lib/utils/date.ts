// ============================================================
// utils/date.ts
// Helpers de data para cálculos de candles
// ============================================================

/**
 * Retorna o timestamp (ms) da abertura da semana corrente (segunda-feira 00:00 UTC).
 */
export function currentWeekOpenTimestamp(): number {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = domingo, 1 = segunda...
  // ISO week: segunda = início
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysFromMonday,
      0,
      0,
      0,
      0
    )
  );
  return monday.getTime();
}

/**
 * Retorna o timestamp (ms) de N dias atrás a partir de agora.
 */
export function daysAgoTimestamp(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

/**
 * Formata número como percentual com 2 casas decimais.
 */
export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

/**
 * Formata número como USD com separadores de milhar.
 */
export function formatUSD(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
