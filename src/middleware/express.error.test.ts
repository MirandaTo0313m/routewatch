import { describe, it, expect, vi, beforeEach } from "vitest";
import { errorRouteWatch } from "./express.error";
import { clearHits } from "../tracker";
import { Request, Response, NextFunction } from "express";

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    path: "/api/data",
    method: "GET",
    route: { path: "/api/data" },
    ...overrides,
  } as unknown as Request;
}

function makeRes(statusCode = 200): Response {
  const listeners: Record<string, Array<() => void>> = {};
  return {
    statusCode,
    on: (event: string, cb: () => void) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    },
    emit: (event: string) => {
      (listeners[event] || []).forEach((fn) => fn());
    },
  } as unknown as Response;
}

function makeNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

beforeEach(() => {
  clearHits();
});

describe("errorRouteWatch", () => {
  it("calls next()", () => {
    const middleware = errorRouteWatch();
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("does not call onError for 2xx responses", () => {
    const onError = vi.fn();
    const middleware = errorRouteWatch({ onError });
    const req = makeReq();
    const res = makeRes(200);
    const next = makeNext();
    middleware(req, res, next);
    (res as any).emit("finish");
    expect(onError).not.toHaveBeenCalled();
  });

  it("calls onError for 4xx responses", () => {
    const onError = vi.fn();
    const middleware = errorRouteWatch({ onError });
    const req = makeReq();
    const res = makeRes(404);
    const next = makeNext();
    middleware(req, res, next);
    (res as any).emit("finish");
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].statusCode).toBe(404);
  });

  it("calls onError for 5xx responses", () => {
    const onError = vi.fn();
    const middleware = errorRouteWatch({ onError });
    const req = makeReq();
    const res = makeRes(500);
    const next = makeNext();
    middleware(req, res, next);
    (res as any).emit("finish");
    expect(onError).toHaveBeenCalledOnce();
  });

  it("ignores favicon.ico", () => {
    const onError = vi.fn();
    const middleware = errorRouteWatch({ onError });
    const req = makeReq({ path: "/favicon.ico" });
    const res = makeRes(500);
    const next = makeNext();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    (res as any).emit("finish");
    expect(onError).not.toHaveBeenCalled();
  });

  it("respects custom ignore paths", () => {
    const onError = vi.fn();
    const middleware = errorRouteWatch({ ignore: ["/health"], onError });
    const req = makeReq({ path: "/health" });
    const res = makeRes(503);
    const next = makeNext();
    middleware(req, res, next);
    (res as any).emit("finish");
    expect(onError).not.toHaveBeenCalled();
  });
});
