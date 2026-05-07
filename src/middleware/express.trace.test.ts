import { describe, it, expect, beforeEach, vi } from "vitest";
import { traceRouteWatch, getTraceHits, clearTraceHitStore } from "./express.trace";
import { Request, Response, NextFunction } from "express";

function makeReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: "GET",
    path: "/api/test",
    headers: {},
    route: { path: "/api/test" },
    ...overrides,
  };
}

function makeRes(): Partial<Response> & { on: ReturnType<typeof vi.fn> } {
  const listeners: Record<string, Function[]> = {};
  return {
    statusCode: 200,
    setHeader: vi.fn(),
    on: vi.fn((event: string, cb: Function) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    }),
    emit(event: string) {
      (listeners[event] || []).forEach((fn) => fn());
    },
  } as any;
}

function makeNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

beforeEach(() => {
  clearTraceHitStore();
});

describe("traceRouteWatch", () => {
  it("calls next()", () => {
    const mw = traceRouteWatch();
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();
    mw(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
  });

  it("records a hit on response finish", () => {
    const mw = traceRouteWatch();
    const req = makeReq();
    const res = makeRes();
    mw(req as Request, res as Response, makeNext());
    (res as any).emit("finish");
    const hits = getTraceHits();
    expect(hits).toHaveLength(1);
    expect(hits[0].route).toBe("/api/test");
    expect(hits[0].method).toBe("GET");
  });

  it("uses x-trace-id header if present", () => {
    const mw = traceRouteWatch();
    const req = makeReq({ headers: { "x-trace-id": "my-trace" } });
    const res = makeRes();
    mw(req as Request, res as Response, makeNext());
    (res as any).emit("finish");
    expect(getTraceHits()[0].traceId).toBe("my-trace");
  });

  it("ignores paths in ignore list", () => {
    const mw = traceRouteWatch({ ignore: ["/health"] });
    const req = makeReq({ path: "/health" });
    const res = makeRes();
    const next = makeNext();
    mw(req as Request, res as Response, next);
    (res as any).emit("finish");
    expect(getTraceHits()).toHaveLength(0);
    expect(next).toHaveBeenCalled();
  });

  it("calls onHit callback with the trace hit", () => {
    const onHit = vi.fn();
    const mw = traceRouteWatch({ onHit });
    const req = makeReq();
    const res = makeRes();
    mw(req as Request, res as Response, makeNext());
    (res as any).emit("finish");
    expect(onHit).toHaveBeenCalledOnce();
    expect(onHit.mock.calls[0][0]).toMatchObject({ method: "GET", route: "/api/test" });
  });

  it("sets x-trace-id and x-span-id response headers", () => {
    const mw = traceRouteWatch();
    const req = makeReq();
    const res = makeRes();
    mw(req as Request, res as Response, makeNext());
    expect(res.setHeader).toHaveBeenCalledWith("x-trace-id", expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith("x-span-id", expect.any(String));
  });
});
