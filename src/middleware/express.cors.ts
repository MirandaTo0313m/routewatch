import type { Request, Response, NextFunction } from "express";
import { trackHit } from "../tracker";
import { shouldIgnore } from "./express";

export interface CorsRouteWatchOptions {
  ignore?: string[];
  trackCorsOrigin?: boolean;
  onHit?: (hit: ReturnType<typeof trackHit>) => void;
}

/**
 * Express middleware that tracks route hits and enriches them with
 * CORS-related metadata (origin, preflight status).
 */
export function corsRouteWatch(options: CorsRouteWatchOptions = {}) {
  const { ignore = [], trackCorsOrigin = true, onHit } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    if (shouldIgnore(req.path, ignore)) {
      return next();
    }

    const startTime = Date.now();
    const isPreflight = req.method === "OPTIONS";
    const origin = trackCorsOrigin
      ? (req.headers["origin"] as string | undefined)
      : undefined;

    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const hit = trackHit({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        meta: {
          ...(origin ? { origin } : {}),
          ...(isPreflight ? { preflight: true } : {}),
        },
      });

      if (onHit) {
        onHit(hit);
      }
    });

    next();
  };
}
