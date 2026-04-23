/** Парсинг строк вида 15m, 7d, 24h (как у jsonwebtoken expiresIn). */
export function parseDurationToMs(value: string | undefined, fallbackMs: number): number {
  if (!value || !value.trim()) return fallbackMs;
  const m = /^(\d+)(ms|s|m|h|d)$/i.exec(value.trim());
  if (!m) return fallbackMs;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1) return fallbackMs;
  const unit = m[2].toLowerCase();
  const mult: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return n * (mult[unit] ?? fallbackMs);
}
