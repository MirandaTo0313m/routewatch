import { Request, Response, NextFunction } from 'express';
import { defaultTracker, RouteTracker } from '../tracker';

export interface RouteWatchOptions {
  tracker?: RouteTracker;
  /** Paths to ignore (exact match or prefix) */
  ignore?: string[];
}

function shouldIgnore(path: string, ignoreList: string[]): boolean {
  return ignoreList.some(
    (pattern) => path === pattern || path.startsWith(pattern)
  );
}

export function routeWatch(options: RouteWatchOptions = {}) {
  const tracker = options.tracker ?? defaultTracker;
  const ignoreList = options.ignore ?? [];

  return function routeWatchMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const startTime = process.hrtime.bigint();
    const path = req.route?.path ?? req.path;

    if (shouldIgnore(path, ignoreList)) {
      return next();
    }

    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const responseTimeMs = Number(endTime - startTime) / 1_000_000;

      tracker.record({
        method: req.method,
        path,
        statusCode: res.statusCode,
        responseTimeMs,
        timestamp: Date.now(),
      });
    });

    next();
  };
}

export { defaultTracker as tracker };
