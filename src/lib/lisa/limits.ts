/**
 * Limits on LISA, so a visitor (or a script) can't run up the AI bill: a number of questions per visitor in a
 * window, and a daily total. Counted in this server's memory: on Vercel each running copy of the site counts on
 * its own, so these are approximate ceilings, not exact quotas. LISA_DAILY_LIMIT changes the daily total.
 */
export const PER_VISITOR = 20;
export const WINDOW_MS = 10 * 60_000;

type State = { visitors: Map<string, number[]>; day: string; today: number };
const g = globalThis as unknown as { __lisaLimits?: State };
const state = (): State => (g.__lisaLimits ??= { visitors: new Map(), day: "", today: 0 });

export const dailyLimit = () => Number(process.env.LISA_DAILY_LIMIT) || 3000;

/** Counts one question. Returns null if allowed, or why not. */
export function takeQuestion(visitor: string, now = Date.now()): "visitor" | "daily" | null {
  const s = state();
  const day = new Date(now).toISOString().slice(0, 10);
  if (s.day !== day) {
    s.day = day;
    s.today = 0;
  }
  if (s.today >= dailyLimit()) return "daily";
  const recent = (s.visitors.get(visitor) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_VISITOR) {
    s.visitors.set(visitor, recent);
    return "visitor";
  }
  recent.push(now);
  s.visitors.set(visitor, recent);
  s.today++;
  // Forget visitors who have gone quiet, so the map doesn't grow without end.
  if (s.visitors.size > 5000) for (const [k, v] of s.visitors) if (!v.some((t) => now - t < WINDOW_MS)) s.visitors.delete(k);
  return null;
}

/** Tests only. */
export function resetLimits() {
  g.__lisaLimits = undefined;
}
