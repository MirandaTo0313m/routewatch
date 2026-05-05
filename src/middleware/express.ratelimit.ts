import type { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  onViolation?: (info: ViolationInfo) => void;
  keyBy?: (req: Request) => string;
}

export interface ViolationInfo {
  ip: string;
  method: string;
  path: string;
  count: number;
  windowMs: number;
}

interface HitEntry {
  count: number;
  resetAt: number;
}

let hitStore: Map<string, HitEntry> = new Map();

export function clearHitStore(): void {
  hitStore = new Map();
}

function defaultKey(req: Request): string {
  return req.ip ?? 'unknown';
}

export function rateLimitWatch(options: RateLimitOptions) {
  const { maxRequests, windowMs, onViolation, keyBy = defaultKey } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    const key = keyBy(req);
    const now = Date.now();

    let entry = hitStore.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count += 1;
    hitStore.set(key, entry);

    if (entry.count > maxRequests) {
      const info: ViolationInfo = {
        ip: req.ip ?? 'unknown',
        method: req.method,
        path: req.path,
        count: entry.count,
        windowMs,
      };

      if (onViolation) {
        onViolation(info);
      }
    }

    next();
  };
}
