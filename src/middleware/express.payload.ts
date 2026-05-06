import { Request, Response, NextFunction } from "express";
import { trackHit } from "../tracker";

export interface PayloadWatchOptions {
  ignore?: string[];
  trackRequestSize?: boolean;
  trackResponseSize?: boolean;
  sizeThresholdBytes?: number;
}

const DEFAULT_OPTIONS: Required<PayloadWatchOptions> = {
  ignore: [],
  trackRequestSize: true,
  trackResponseSize: true,
  sizeThresholdBytes: 0,
};

function shouldIgnore(path: string, ignore: string[]): boolean {
  return ignore.some((pattern) => path.startsWith(pattern));
}

export function payloadRouteWatch(options: PayloadWatchOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return function (req: Request, res: Response, next: NextFunction): void {
    if (shouldIgnore(req.path, opts.ignore)) {
      return next();
    }

    const requestSize = opts.trackRequestSize
      ? parseInt(req.headers["content-length"] ?? "0", 10) || 0
      : undefined;

    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    let responseSize = 0;

    if (opts.trackResponseSize) {
      res.write = function (chunk: any, ...args: any[]): boolean {
        if (chunk) {
          responseSize += Buffer.byteLength(
            typeof chunk === "string" ? chunk : chunk,
            typeof chunk === "string" ? "utf8" : undefined
          );
        }
        return originalWrite(chunk, ...args);
      };

      res.end = function (chunk?: any, ...args: any[]): Response {
        if (chunk) {
          responseSize += Buffer.byteLength(
            typeof chunk === "string" ? chunk : chunk,
            typeof chunk === "string" ? "utf8" : undefined
          );
        }
        return originalEnd(chunk, ...args);
      };
    }

    res.on("finish", () => {
      const reqBytes = requestSize ?? 0;
      const resBytes = responseSize;

      if (
        reqBytes >= opts.sizeThresholdBytes ||
        resBytes >= opts.sizeThresholdBytes
      ) {
        trackHit({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          timestamp: Date.now(),
          requestBytes: opts.trackRequestSize ? reqBytes : undefined,
          responseBytes: opts.trackResponseSize ? resBytes : undefined,
        });
      }
    });

    next();
  };
}
