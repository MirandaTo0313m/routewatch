import { corsRouteWatch } from "./express.cors";
import type { Request, Response, NextFunction } from "express";

function makeReq(
  overrides: Partial<Request> = {}
): Request {
  return {
    method: "GET",
    path: "/api/users",
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response & { _listeners: Record<string, () => void> } {
  const listeners: Record<string, () => void> = {};
  return {
    statusCode: 200,
    on(event: string, cb: () => void) {
      listeners[event] = cb;
    },
    _listeners: listeners,
  } as unknown as Response & { _listeners: Record<string, () => void> };
}

const makeNext = (): NextFunction => jest.fn() as unknown as NextFunction;

describe("corsRouteWatch", () => {
  it("calls next() for normal requests", () => {
    const middleware = corsRouteWatch();
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("skips ignored paths", () => {
    const middleware = corsRouteWatch({ ignore: ["/health"] });
    const req = makeReq({ path: "/health" } as Partial<Request>);
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("calls onHit with origin metadata when origin header is present", () => {
    const onHit = jest.fn();
    const middleware = corsRouteWatch({ trackCorsOrigin: true, onHit });
    const req = makeReq({
      headers: { origin: "https://example.com" },
    } as Partial<Request>);
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);
    res._listeners["finish"]();

    expect(onHit).toHaveBeenCalledTimes(1);
    const hit = onHit.mock.calls[0][0];
    expect(hit.meta?.origin).toBe("https://example.com");
  });

  it("marks OPTIONS requests as preflight", () => {
    const onHit = jest.fn();
    const middleware = corsRouteWatch({ onHit });
    const req = makeReq({ method: "OPTIONS" } as Partial<Request>);
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);
    res._listeners["finish"]();

    const hit = onHit.mock.calls[0][0];
    expect(hit.meta?.preflight).toBe(true);
  });

  it("does not include origin when trackCorsOrigin is false", () => {
    const onHit = jest.fn();
    const middleware = corsRouteWatch({ trackCorsOrigin: false, onHit });
    const req = makeReq({
      headers: { origin: "https://example.com" },
    } as Partial<Request>);
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);
    res._listeners["finish"]();

    const hit = onHit.mock.calls[0][0];
    expect(hit.meta?.origin).toBeUndefined();
  });
});
