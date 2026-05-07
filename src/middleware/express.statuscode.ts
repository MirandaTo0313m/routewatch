import { Request, Response, NextFunction } from "express";
import { recordHit } from "../tracker";

export interface StatusCodeHit {
  route: string;
  method: string;
  statusCode: number;
  timestamp: number;
  durationMs: number;
}

const statusCodeHitStore: StatusCodeHit[] = [];

export function getStatusCodeHits(): StatusCodeHit[] {
  return [...statusCodeHitStore];
}

export function clearStatusCodeHitStore(): void {
  statusCodeHitStore.length = 0;
}

function shouldIgnore(path: string, ignore: string[]): boolean {
  return ignore.some((p) => path.startsWith(p));
}

export interface StatusCodeWatchOptions {
  ignore?: string[];
}

export function statusCodeRouteWatch(options: StatusCodeWatchOptions = {}) {
  const ignore = options.ignore ?? ["/health", "/favicon.ico"];

  return function (req: Request, res: Response, next: NextFunction): void {
    if (shouldIgnore(req.path, ignore)) {
      return next();
    }

    const start = Date.now();
    const route = req.route?.path ?? req.path;

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const hit: StatusCodeHit = {
        route,
        method: req.method,
        statusCode: res.statusCode,
        timestamp: Date.now(),
        durationMs,
      };
      statusCodeHitStore.push(hit);
      recordHit({ route, method: req.method, statusCode: res.statusCode, durationMs, timestamp: hit.timestamp });
    });

    next();
  };
}
