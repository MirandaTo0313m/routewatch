import { Request, Response, NextFunction, RequestHandler } from "express";
import { v4 as uuidv4 } from "uuid";
import { TraceHit } from "../tracereport";

export interface TraceWatchOptions {
  ignore?: string[];
  resolveTraceId?: (req: Request) => string;
  resolveParentSpanId?: (req: Request) => string | undefined;
  onHit?: (hit: TraceHit) => void;
}

const traceHitStore: TraceHit[] = [];

export function getTraceHits(): TraceHit[] {
  return [...traceHitStore];
}

export function clearTraceHitStore(): void {
  traceHitStore.length = 0;
}

function shouldIgnore(path: string, ignore: string[]): boolean {
  return ignore.some((p) => path.startsWith(p));
}

export function traceRouteWatch(options: TraceWatchOptions = {}): RequestHandler {
  const {
    ignore = [],
    resolveTraceId = (req) =>
      (req.headers["x-trace-id"] as string) || uuidv4(),
    resolveParentSpanId = (req) =>
      req.headers["x-parent-span-id"] as string | undefined,
    onHit,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (shouldIgnore(req.path, ignore)) return next();

    const traceId = resolveTraceId(req);
    const spanId = uuidv4();
    const parentSpanId = resolveParentSpanId(req);
    const start = Date.now();

    res.setHeader("x-trace-id", traceId);
    res.setHeader("x-span-id", spanId);

    res.on("finish", () => {
      const hit: TraceHit = {
        method: req.method,
        route: req.route?.path ?? req.path,
        traceId,
        spanId,
        parentSpanId,
        durationMs: Date.now() - start,
        statusCode: res.statusCode,
        timestamp: Date.now(),
      };
      traceHitStore.push(hit);
      onHit?.(hit);
    });

    next();
  };
}
