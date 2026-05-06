import { Request, Response, NextFunction } from "express";
import { trackHit, RouteHit } from "../tracker";

export interface DeprecationMiddlewareOptions {
  /** Map of route keys ("METHOD:/path" or "/path") to deprecation date strings */
  deprecatedRoutes?: Record<string, string>;
  ignore?: string[];
  warnHeader?: boolean;
}

const hitStore: RouteHit[] = [];

export function getDeprecationHits(): RouteHit[] {
  return [...hitStore];
}

export function clearDeprecationHitStore(): void {
  hitStore.length = 0;
}

function shouldIgnore(route: string, ignore: string[]): boolean {
  return ignore.some((pattern) => route.startsWith(pattern));
}

function isDeprecated(
  method: string,
  route: string,
  deprecatedRoutes: Record<string, string>
): string | undefined {
  return (
    deprecatedRoutes[`${method}:${route}`] ??
    deprecatedRoutes[route]
  );
}

export function deprecationRouteWatch(
  options: DeprecationMiddlewareOptions = {}
) {
  const {
    deprecatedRoutes = {},
    ignore = [],
    warnHeader = true,
  } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    const route = req.path;
    const method = req.method.toUpperCase();

    if (shouldIgnore(route, ignore)) {
      return next();
    }

    const since = isDeprecated(method, route, deprecatedRoutes);

    const start = Date.now();

    res.on("finish", () => {
      const hit: RouteHit = {
        route,
        method,
        statusCode: res.statusCode,
        duration: Date.now() - start,
        timestamp: Date.now(),
      };
      trackHit(hit);
      hitStore.push(hit);
    });

    if (since) {
      if (warnHeader) {
        res.setHeader("Deprecation", since);
        res.setHeader("Sunset", since);
      }
    }

    next();
  };
}
