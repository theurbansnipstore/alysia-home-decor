import "server-only";

/**
 * In-memory, single-process sliding-window limiter — deliberately not a
 * distributed solution (Redis etc.). This is a "smallest clean abstraction
 * necessary" fit for a single-instance dev/small-deployment app, not a
 * production-scale rate limiter: state resets on restart and isn't shared
 * across multiple server instances. Scoped narrowly to forgot-password,
 * the one endpoint in this module that's abuse-sensitive (email-bombing a
 * victim, or brute-force-probing which emails are registered via timing).
 */
const hits = new Map<string, number[]>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = hits.get(key) ?? [];
  const withinWindow = existing.filter((t) => now - t < windowMs);

  if (withinWindow.length >= limit) {
    hits.set(key, withinWindow);
    return false;
  }

  withinWindow.push(now);
  hits.set(key, withinWindow);
  return true;
}
