import { Request, Response, NextFunction } from 'express';
import { trackHit } from '../tracker';
import { detectRateLimitViolations } from '../ratelimit';

type KeyFn = (req: Request) => string;

interface RateLimitWatchOptions {
  windowMs?: number;
  maxRequests?: number;
  keyFn?: KeyFn;
  onViolation?: (message: string, req: Request) => void;
  ignore?: string[];
}

const hitStore: Map<string, { count: number; windowStart: number }> = new Map();

export function clearHitStore() {
  hitStore.clear();
}

export const defaultKey: KeyFn = (req) =>
  `${req.ip}:${req.method}:${req.path}`;

export function rateLimitWatch(options: RateLimitWatchOptions = {}) {
  const {
    windowMs = 60_000,
    maxRequests = 100,
    keyFn = defaultKey,
    onViolation,
    ignore = [],
  } = options;

  return function (req: Request, res: Response, next: NextFunction) {
    const path = req.path;

    if (ignore.some((p) => path.startsWith(p))) {
      return next();
    }

    const now = Date.now();
    const key = keyFn(req);
    const entry = hitStore.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      hitStore.set(key, { count: 1, windowStart: now });
    } else {
      entry.count += 1;
    }

    const current = hitStore.get(key)!;

    trackHit({
      method: req.method,
      path,
      statusCode: res.statusCode,
      timestamp: now,
      responseTimeMs: 0,
    });

    if (current.count > maxRequests) {
      const violations = detectRateLimitViolations(
        [{ method: req.method, path, statusCode: res.statusCode, timestamp: now, responseTimeMs: 0 }],
        { windowMs, maxRequests }
      );
      violations.forEach((v) => {
        if (onViolation) onViolation(v.message, req);
      });
    }

    next();
  };
}
