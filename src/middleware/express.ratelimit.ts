/**
 * Express middleware that attaches rate-limit violation detection
 * to routewatch hit tracking.
 */

import type { Request, Response, NextFunction } from "express";
import {
  RateLimitConfig,
  RouteHitTimestamp,
  DEFAULT_RATE_LIMIT_CONFIG,
  detectRateLimitViolations,
  formatViolationMessage,
} from "../ratelimit";

export interface RateLimitMiddlewareOptions {
  config?: RateLimitConfig;
  /** Called when one or more violations are detected on a request */
  onViolation?: (violations: ReturnType<typeof detectRateLimitViolations>) => void;
  /** If true, respond with 429 when a violation is detected (default: false) */
  block?: boolean;
}

/**
 * In-process store of recent hits. In production you'd replace this
 * with a shared store (Redis, etc.), but for local dev this is fine.
 */
const hitStore: RouteHitTimestamp[] = [];

/** Exposed for testing / reset between test runs */
export function clearHitStore(): void {
  hitStore.length = 0;
}

export function rateLimitWatch(
  options: RateLimitMiddlewareOptions = {}
) {
  const config = options.config ?? DEFAULT_RATE_LIMIT_CONFIG;
  const block = options.block ?? false;
  const onViolation =
    options.onViolation ??
    ((violations) => {
      for (const v of violations) {
        console.warn(formatViolationMessage(v));
      }
    });

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const method = req.method ?? "GET";
    const path = req.path ?? req.url ?? "/";

    hitStore.push({ method, path, timestamp: Date.now() });

    // Prune old hits to avoid unbounded memory growth
    const cutoff = Date.now() - config.windowMs;
    while (hitStore.length > 0 && hitStore[0].timestamp < cutoff) {
      hitStore.shift();
    }

    const violations = detectRateLimitViolations(hitStore, config);

    if (violations.length > 0) {
      onViolation(violations);
      if (block) {
        res.status(429).json({
          error: "Too Many Requests",
          violations: violations.map((v) => ({
            method: v.method,
            path: v.path,
            hits: v.hits,
          })),
        });
        return;
      }
    }

    next();
  };
}
