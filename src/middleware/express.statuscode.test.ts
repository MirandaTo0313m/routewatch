import { statusCodeRouteWatch, getStatusCodeHits, clearStatusCodeHitStore } from "./express.statuscode";
import { EventEmitter } from "events";

function makeReq(path: string, method = "GET"): any {
  return { path, method, route: { path } };
}

function makeRes(statusCode = 200): any {
  const emitter = new EventEmitter();
  return Object.assign(emitter, { statusCode });
}

function makeNext(): jest.Mock {
  return jest.fn();
}

beforeEach(() => {
  clearStatusCodeHitStore();
});

describe("statusCodeRouteWatch", () => {
  it("records a hit with the correct status code on finish", () => {
    const mw = statusCodeRouteWatch();
    const req = makeReq("/api/users");
    const res = makeRes(200);
    const next = makeNext();

    mw(req, res, next);
    expect(next).toHaveBeenCalled();

    res.emit("finish");
    const hits = getStatusCodeHits();
    expect(hits).toHaveLength(1);
    expect(hits[0].statusCode).toBe(200);
    expect(hits[0].route).toBe("/api/users");
    expect(hits[0].method).toBe("GET");
  });

  it("records a 404 status code", () => {
    const mw = statusCodeRouteWatch();
    const req = makeReq("/api/missing");
    const res = makeRes(404);
    const next = makeNext();

    mw(req, res, next);
    res.emit("finish");

    const hits = getStatusCodeHits();
    expect(hits[0].statusCode).toBe(404);
  });

  it("ignores health check routes by default", () => {
    const mw = statusCodeRouteWatch();
    const req = makeReq("/health");
    const res = makeRes(200);
    const next = makeNext();

    mw(req, res, next);
    res.emit("finish");

    expect(getStatusCodeHits()).toHaveLength(0);
  });

  it("respects custom ignore list", () => {
    const mw = statusCodeRouteWatch({ ignore: ["/internal"] });
    const req = makeReq("/internal/ping");
    const res = makeRes(200);
    const next = makeNext();

    mw(req, res, next);
    res.emit("finish");

    expect(getStatusCodeHits()).toHaveLength(0);
  });

  it("records durationMs as a non-negative number", () => {
    const mw = statusCodeRouteWatch();
    const req = makeReq("/api/test");
    const res = makeRes(201);
    const next = makeNext();

    mw(req, res, next);
    res.emit("finish");

    const hits = getStatusCodeHits();
    expect(hits[0].durationMs).toBeGreaterThanOrEqual(0);
  });
});
