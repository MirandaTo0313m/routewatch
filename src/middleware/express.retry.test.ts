import { retryRouteWatch } from "./express.retry";
import { clearHits, getHits } from "../tracker";
import { EventEmitter } from "events";

function makeReq(
  path = "/api/test",
  method = "GET",
  headers: Record<string, string> = {}
): any {
  return { path, method, headers, route: { path } };
}

function makeRes(statusCode = 200): any {
  const emitter = new EventEmitter();
  return Object.assign(emitter, { statusCode });
}

function makeNext(): jest.Mock {
  return jest.fn();
}

beforeEach(() => clearHits());

describe("retryRouteWatch", () => {
  it("calls next()", () => {
    const mw = retryRouteWatch();
    const next = makeNext();
    const res = makeRes();
    mw(makeReq(), res, next);
    expect(next).toHaveBeenCalled();
  });

  it("records a hit on finish with retryCount 0 when header absent", () => {
    const mw = retryRouteWatch();
    const res = makeRes(200);
    mw(makeReq("/api/data", "GET", {}), res, makeNext());
    res.emit("finish");
    const hits = getHits();
    expect(hits).toHaveLength(1);
    expect(hits[0].retryCount).toBe(0);
    expect(hits[0].route).toBe("/api/data");
  });

  it("reads retry count from default header", () => {
    const mw = retryRouteWatch();
    const res = makeRes(200);
    mw(makeReq("/api/data", "GET", { "x-retry-count": "3" }), res, makeNext());
    res.emit("finish");
    expect(getHits()[0].retryCount).toBe(3);
  });

  it("reads retry count from custom header", () => {
    const mw = retryRouteWatch({ retryHeader: "x-attempts" });
    const res = makeRes(200);
    mw(makeReq("/api/data", "GET", { "x-attempts": "2" }), res, makeNext());
    res.emit("finish");
    expect(getHits()[0].retryCount).toBe(2);
  });

  it("ignores paths matching ignore list", () => {
    const mw = retryRouteWatch({ ignore: ["/health"] });
    const res = makeRes();
    const next = makeNext();
    mw(makeReq("/health"), res, next);
    res.emit("finish");
    expect(getHits()).toHaveLength(0);
    expect(next).toHaveBeenCalled();
  });

  it("records status code correctly", () => {
    const mw = retryRouteWatch();
    const res = makeRes(500);
    mw(makeReq("/api/fail", "POST", {}), res, makeNext());
    res.emit("finish");
    expect(getHits()[0].statusCode).toBe(500);
  });
});
