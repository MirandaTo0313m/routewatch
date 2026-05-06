import { Request, Response, NextFunction } from "express";
import { trackHit, RouteHit } from "../tracker";

const ignoredPaths = ["/favicon.ico"];

function shouldIgnore(path: string): boolean {
  return ignoredPaths.some((p) => path.startsWith(p));
}

export interface ErrorRouteWatchOptions {
  ignore?: string[];
  onError?: (hit: RouteHit) => void;
}

export function errorRouteWatch(options: ErrorRouteWatchOptions = {}) {
  const { ignore = [], onError } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    if (shouldIgnore(req.path) || ignore.some((p) => req.path.startsWith(p))) {
      return next();
    }

    const start = Date.now();

    res.on("finish", () => {
      const hit: RouteHit = {
        route: req.route?.path ?? req.path,
        method: req.method,
        statusCode: res.statusCode,
        duration: Date.now() - start,
        timestamp: Date.now(),
      };

      trackHit(hit);

      if (res.statusCode >= 400 && onError) {
        onError(hit);
      }
    });

    next();
  };
}
