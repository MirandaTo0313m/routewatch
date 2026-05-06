import { Request, Response, NextFunction } from "express";
import { trackHit, RouteHit } from "../tracker";

export interface RetryMiddlewareOptions {
  retryHeader?: string;
  ignore?: string[];
}

const DEFAULT_RETRY_HEADER = "x-retry-count";

function shouldIgnore(path: string, patterns: string[]): boolean {
  return patterns.some((p) => path.startsWith(p));
}

export function retryRouteWatch(options: RetryMiddlewareOptions = {}) {
  const retryHeader = options.retryHeader ?? DEFAULT_RETRY_HEADER;
  const ignore = options.ignore ?? [];

  return function (req: Request, res: Response, next: NextFunction): void {
    if (shouldIgnore(req.path, ignore)) {
      return next();
    }

    const start = Date.now();
    const retryCount = parseInt(req.headers[retryHeader] as string ?? "0", 10) || 0;

    res.on("finish", () => {
      const hit: RouteHit = {
        route: req.route?.path ?? req.path,
        method: req.method,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
        timestamp: start,
        retryCount,
      };
      trackHit(hit);
    });

    next();
  };
}
