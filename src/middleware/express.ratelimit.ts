import { Request, Response, NextFunction } from 'express';

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyFn?: (req: Request) => string;
  message?: string;
}

interface HitRecord {
  count: number;
  windowStart: number;
}

let hitStore: Map<string, HitRecord> = new Map();

export function clearHitStore(): void {
  hitStore = new Map();
}

export function defaultKey(req: Request): string {
  return `${req.ip}:${req.method}:${req.path}`;
}

export function rateLimitWatch(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyFn = defaultKey, message = 'Too many requests' } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    const key = keyFn(req);
    const now = Date.now();
    const existing = hitStore.get(key);

    if (!existing || now - existing.windowStart >= windowMs) {
      hitStore.set(key, { count: 1, windowStart: now });
      next();
      return;
    }

    existing.count += 1;

    if (existing.count > maxRequests) {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil((existing.windowStart + windowMs - now) / 1000),
      });
      return;
    }

    next();
  };
}
