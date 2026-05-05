/**
 * Rate limit detection: flags routes that exceed a hit threshold
 * within a rolling time window.
 */

export interface RateLimitConfig {
  windowMs: number;   // rolling window in milliseconds
  maxHits: number;    // max allowed hits per route+method in the window
}

export interface RateLimitViolation {
  method: string;
  path: string;
  hits: number;
  windowMs: number;
  maxHits: number;
}

export interface RouteHitTimestamp {
  method: string;
  path: string;
  timestamp: number;
}

/** Default config: 100 hits per route in 60 seconds */
export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxHits: 100,
};

/**
 * Given a list of timestamped hits and a config, returns all
 * route+method combinations that exceeded the rate limit.
 */
export function detectRateLimitViolations(
  hits: RouteHitTimestamp[],
  config: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG,
  now: number = Date.now()
): RateLimitViolation[] {
  const windowStart = now - config.windowMs;

  const counts = new Map<string, number>();

  for (const hit of hits) {
    if (hit.timestamp < windowStart) continue;
    const key = `${hit.method.toUpperCase()}::${hit.path}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const violations: RateLimitViolation[] = [];

  for (const [key, count] of counts.entries()) {
    if (count > config.maxHits) {
      const [method, path] = key.split("::");
      violations.push({
        method,
        path,
        hits: count,
        windowMs: config.windowMs,
        maxHits: config.maxHits,
      });
    }
  }

  return violations.sort((a, b) => b.hits - a.hits);
}

/** Human-readable summary of a violation */
export function formatViolationMessage(v: RateLimitViolation): string {
  const seconds = v.windowMs / 1000;
  return (
    `[RATE LIMIT] ${v.method} ${v.path} — ` +
    `${v.hits} hits in ${seconds}s (limit: ${v.maxHits})`
  );
}
