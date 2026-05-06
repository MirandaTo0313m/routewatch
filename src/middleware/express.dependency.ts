import { Request, Response, NextFunction } from "express";
import { trackHit } from "../tracker";

const IGNORE_EXTENSIONS = /\.(ico|png|jpg|jpeg|css|js|map|woff|woff2|ttf|svg)$/i;

function shouldIgnore(path: string): boolean {
  return IGNORE_EXTENSIONS.test(path);
}

export interface DependencyWatchOptions {
  ignore?: string[];
  captureReferer?: boolean;
}

export function dependencyRouteWatch(
  options: DependencyWatchOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const { ignore = [], captureReferer = true } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    const path = req.path || req.url || "";

    if (shouldIgnore(path) || ignore.includes(path)) {
      return next();
    }

    const startTime = Date.now();
    const referer = captureReferer
      ? (req.headers["referer"] ||
          req.headers["x-called-from"] ||
          undefined)
      : undefined;

    const originalEnd = res.end.bind(res);

    (res as any).end = function (
      chunk?: any,
      encoding?: any,
      callback?: any
    ): Response {
      const latency = Date.now() - startTime;
      const route =
        (req as any).route?.path ||
        req.path ||
        req.url ||
        "unknown";

      trackHit({
        route,
        method: req.method,
        statusCode: res.statusCode,
        timestamp: startTime,
        referer: referer as string | undefined,
        latency,
      } as any);

      return originalEnd(chunk, encoding, callback);
    };

    next();
  };
}
