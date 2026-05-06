import { Request, Response, NextFunction } from "express";
import { trackHit, RouteHit } from "../tracker";

export interface GeoRouteWatchOptions {
  ignore?: string[];
  resolveCountry?: (req: Request) => string | undefined;
}

const DEFAULT_IGNORE = ["/health", "/favicon.ico"];

function shouldIgnore(path: string, ignore: string[]): boolean {
  return ignore.some((p) => path.startsWith(p));
}

function defaultResolveCountry(req: Request): string | undefined {
  const header =
    req.headers["cf-ipcountry"] ||
    req.headers["x-country-code"] ||
    req.headers["x-geo-country"];
  if (Array.isArray(header)) return header[0];
  return header as string | undefined;
}

export function geoRouteWatch(options: GeoRouteWatchOptions = {}) {
  const ignore = [...DEFAULT_IGNORE, ...(options.ignore ?? [])];
  const resolveCountry = options.resolveCountry ?? defaultResolveCountry;

  return function (req: Request, res: Response, next: NextFunction): void {
    if (shouldIgnore(req.path, ignore)) {
      return next();
    }

    const start = Date.now();
    const country = resolveCountry(req);

    res.on("finish", () => {
      const hit: RouteHit = {
        route: req.path,
        method: req.method,
        status: res.statusCode,
        duration: Date.now() - start,
        timestamp: start,
        country,
      };
      trackHit(hit);
    });

    next();
  };
}
