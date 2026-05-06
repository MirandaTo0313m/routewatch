import { Request, Response, NextFunction } from "express";
import { addHit } from "../tracker";

export interface SlowLogOptions {
  thresholdMs?: number;
  ignore?: string[];
  onSlow?: (route: string, method: string, durationMs: number) => void;
}

const DEFAULT_THRESHOLD_MS = 1000;

function shouldIgnore(path: string, ignore: string[]): boolean {
  return ignore.some((pattern) => path.startsWith(pattern));
}

export interface SlowLogHit {
  route: string;
  method: string;
  durationMs: number;
  timestamp: number;
  statusCode: number;
}

const slowHits: SlowLogHit[] = [];

export function getSlowHits(): SlowLogHit[] {
  return [...slowHits];
}

export function clearSlowHits(): void {
  slowHits.length = 0;
}

export function slowLogWatch(options: SlowLogOptions = {}) {
  const {
    thresholdMs = DEFAULT_THRESHOLD_MS,
    ignore = [],
    onSlow,
  } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    const path = req.path ?? "/";

    if (shouldIgnore(path, ignore)) {
      return next();
    }

    const startTime = Date.now();

    res.on("finish", () => {
      const durationMs = Date.now() - startTime;

      if (durationMs >= thresholdMs) {
        const hit: SlowLogHit = {
          route: path,
          method: req.method,
          durationMs,
          timestamp: startTime,
          statusCode: res.statusCode,
        };

        slowHits.push(hit);

        addHit({
          route: path,
          method: req.method,
          statusCode: res.statusCode,
          durationMs,
          timestamp: startTime,
        });

        if (onSlow) {
          onSlow(path, req.method, durationMs);
        }
      }
    });

    next();
  };
}
