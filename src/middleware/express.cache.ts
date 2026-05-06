import { Request, Response, NextFunction } from "express";
import { trackHit } from "../tracker";
import { shouldIgnore } from "./express";

export interface CacheRouteWatchOptions {
  ignore?: string[];
  trackCacheHeaders?: boolean;
}

export interface CacheHitInfo {
  route: string;
  method: string;
  cacheStatus: "HIT" | "MISS" | "BYPASS" | "UNKNOWN";
  timestamp: number;
}

const cacheHits: CacheHitInfo[] = [];

export function clearCacheHitStore(): void {
  cacheHits.length = 0;
}

export function getCacheHits(): CacheHitInfo[] {
  return [...cacheHits];
}

function resolveCacheStatus(res: Response): "HIT" | "MISS" | "BYPASS" | "UNKNOWN" {
  const header =
    res.getHeader("x-cache") ||
    res.getHeader("cf-cache-status") ||
    res.getHeader("x-cache-status");
  if (!header) return "UNKNOWN";
  const val = String(header).toUpperCase();
  if (val.includes("HIT")) return "HIT";
  if (val.includes("MISS")) return "MISS";
  if (val.includes("BYPASS")) return "BYPASS";
  return "UNKNOWN";
}

export function cacheRouteWatch(options: CacheRouteWatchOptions = {}) {
  const { ignore = [], trackCacheHeaders = true } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    const route = req.path || req.url || "/";
    const method = req.method || "GET";

    if (shouldIgnore(route, ignore)) {
      return next();
    }

    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      trackHit({ route, method, statusCode: res.statusCode, duration, timestamp: Date.now() });

      if (trackCacheHeaders) {
        const cacheStatus = resolveCacheStatus(res);
        cacheHits.push({ route, method, cacheStatus, timestamp: Date.now() });
      }
    });

    next();
  };
}
