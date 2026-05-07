import { Request, Response, NextFunction } from "express";

export interface UniqueUserHit {
  route: string;
  method: string;
  userId: string;
  timestamp: number;
  statusCode: number;
}

const uniqueUserHitStore: UniqueUserHit[] = [];

export function getUniqueUserHits(): UniqueUserHit[] {
  return [...uniqueUserHitStore];
}

export function clearUniqueUserHitStore(): void {
  uniqueUserHitStore.length = 0;
}

function shouldIgnore(path: string, ignore: string[]): boolean {
  return ignore.some((p) => path.startsWith(p));
}

export interface UniqueUsersOptions {
  resolveUserId?: (req: Request) => string | undefined;
  ignore?: string[];
}

const defaultResolveUserId = (req: Request): string | undefined => {
  const auth = req.headers["authorization"];
  if (auth) return auth;
  const uid = (req as any).user?.id ?? (req as any).userId;
  return uid ? String(uid) : undefined;
};

export function uniqueUsersWatch(options: UniqueUsersOptions = {}) {
  const {
    resolveUserId = defaultResolveUserId,
    ignore = ["/health", "/favicon.ico"],
  } = options;

  return function (req: Request, res: Response, next: NextFunction): void {
    if (shouldIgnore(req.path, ignore)) {
      return next();
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return next();
    }

    const route = req.route?.path ?? req.path;
    const method = req.method.toUpperCase();
    const timestamp = Date.now();

    res.on("finish", () => {
      uniqueUserHitStore.push({
        route,
        method,
        userId,
        timestamp,
        statusCode: res.statusCode,
      });
    });

    next();
  };
}
