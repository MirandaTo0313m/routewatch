import {
  deprecationRouteWatch,
  clearDeprecationHitStore,
  getDeprecationHits,
} from "./express.deprecation";
import { Request, Response, NextFunction } from "express";

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    path: "/api/v1/users",
    method: "GET",
    ...overrides,
  } as unknown as Request;
}

function makeRes(overrides: Partial<Response> = {}): Response {
  const listeners: Record<string, (() => void)[]> = {};
  return {
    statusCode: 200,
    setHeader: jest.fn(),
    on: (event: string, cb: () => void) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
    },
    emit: (event: string) => {
      (listeners[event] ?? []).forEach((cb) => cb());
    },
    ...overrides,
  } as unknown as Response;
}

function makeNext(): NextFunction {
  return jest.fn() as unknown as NextFunction;
}

beforeEach(() => {
  clearDeprecationHitStore();
});

describe("deprecationRouteWatch", () => {
  it("calls next()", () => {
    const middleware = deprecationRouteWatch();
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("records hit on response finish", () => {
    const middleware = deprecationRouteWatch();
    const req = makeReq({ path: "/api/data", method: "GET" } as any);
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    (res as any).emit("finish");
    const hits = getDeprecationHits();
    expect(hits).toHaveLength(1);
    expect(hits[0].route).toBe("/api/data");
  });

  it("sets Deprecation and Sunset headers for deprecated routes", () => {
    const middleware = deprecationRouteWatch({
      deprecatedRoutes: { "GET:/api/v1/users": "2024-06-01" },
    });
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith("Deprecation", "2024-06-01");
    expect(res.setHeader).toHaveBeenCalledWith("Sunset", "2024-06-01");
  });

  it("does not set headers when warnHeader is false", () => {
    const middleware = deprecationRouteWatch({
      deprecatedRoutes: { "GET:/api/v1/users": "2024-06-01" },
      warnHeader: false,
    });
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it("ignores routes matching ignore list", () => {
    const middleware = deprecationRouteWatch({ ignore: ["/health"] });
    const req = makeReq({ path: "/health", method: "GET" } as any);
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    (res as any).emit("finish");
    expect(getDeprecationHits()).toHaveLength(0);
    expect(next).toHaveBeenCalled();
  });

  it("does not set headers for non-deprecated routes", () => {
    const middleware = deprecationRouteWatch({
      deprecatedRoutes: { "GET:/old": "2023-01-01" },
    });
    const req = makeReq({ path: "/new", method: "GET" } as any);
    const res = makeRes();
    middleware(req, res, makeNext());
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});
