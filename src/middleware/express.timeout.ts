import { Request, Response, NextFunction } from "express";
import { addHit } from "../tracker";

export interface TimeoutOptions {
  limitMs: number;
  ignore?: string[];
  onTimeout?: (req: Request, res: Response) => void;
}

function shouldIgnore(path: string, patterns: string[]): boolean {
  return patterns.some((p) => path.startsWith(p));
}

export function timeoutRouteWatch(options: TimeoutOptions) {
  const { limitMs, ignore = [], onTimeout } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    if (shouldIgnore(req.path, ignore)) {
      return next();
    }

    const start = Date.now();
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      const durationMs = Date.now() - start;

      addHit({
        method: req.method,
        route: req.path,
        statusCode: 408,
        durationMs,
        timestamp: new Date().toISOString(),
        meta: { timeout: true },
      });

      if (onTimeout) {
        onTimeout(req, res);
      } else if (!res.headersSent) {
        res.status(408).json({ error: "Request Timeout" });
      }
    }, limitMs);

    const originalEnd = res.end.bind(res);
    (res as any).end = function (...args: any[]) {
      if (!timedOut) {
        clearTimeout(timer);
        const durationMs = Date.now() - start;
        addHit({
          method: req.method,
          route: req.path,
          statusCode: res.statusCode,
          durationMs,
          timestamp: new Date().toISOString(),
          meta: { timeout: false },
        });
      }
      return originalEnd(...args);
    };

    next();
  };
}
