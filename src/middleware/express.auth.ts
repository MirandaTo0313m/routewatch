import { Request, Response, NextFunction } from "express";
import { trackHit } from "../tracker";
import { shouldIgnore } from "./express";

export interface AuthRouteWatchOptions {
  ignore?: string[];
  trackUnauthenticated?: boolean;
  getUserId?: (req: Request) => string | undefined;
}

/**
 * Express middleware that tracks route hits with authentication context.
 * Records whether each request was authenticated and optionally the user ID.
 */
export function authRouteWatch(options: AuthRouteWatchOptions = {}) {
  const {
    ignore = [],
    trackUnauthenticated = true,
    getUserId,
  } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    if (shouldIgnore(req.path, ignore)) {
      return next();
    }

    const startTime = Date.now();
    const userId = getUserId ? getUserId(req) : undefined;
    const authenticated = userId !== undefined;

    if (!authenticated && !trackUnauthenticated) {
      return next();
    }

    res.on("finish", () => {
      const duration = Date.now() - startTime;
      trackHit({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString(),
        meta: {
          authenticated,
          ...(userId !== undefined && { userId }),
        },
      });
    });

    next();
  };
}
