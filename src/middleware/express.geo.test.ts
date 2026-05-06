import { geoRouteWatch } from "./express.geo";
import { getHits, clearHits } from "../tracker";
import { EventEmitter } from "events";

function makeReq(overrides: Partial<{ path: string; method: string; headers: Record<string, string> }> = {}) {
  return {
    path: "/api/data",
    method: "GET",
    headers: {},
    ...overrides,
  } as any;
}

function makeRes() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, { statusCode: 200 }) as any;
}

function makeNext() {
  return jest.fn();
}

beforeEach(() => clearHits());

describe("geoRouteWatch", () => {
  it("calls next()", () => {
    const middleware = geoRouteWatch();
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("tracks hit with country from cf-ipcountry header", () => {
    const middleware = geoRouteWatch();
    const req = makeReq({ headers: { "cf-ipcountry": "US" } });
    const res = makeRes();
    middleware(req, res, makeNext());
    res.emit("finish");

    const hits = getHits();
    expect(hits).toHaveLength(1);
    expect(hits[0].country).toBe("US");
  });

  it("tracks hit with country from x-country-code header", () => {
    const middleware = geoRouteWatch();
    const req = makeReq({ headers: { "x-country-code": "DE" } });
    const res = makeRes();
    middleware(req, res, makeNext());
    res.emit("finish");

    const hits = getHits();
    expect(hits[0].country).toBe("DE");
  });

  it("uses custom resolveCountry function", () => {
    const middleware = geoRouteWatch({ resolveCountry: () => "JP" });
    const req = makeReq();
    const res = makeRes();
    middleware(req, res, makeNext());
    res.emit("finish");

    const hits = getHits();
    expect(hits[0].country).toBe("JP");
  });

  it("ignores /health route", () => {
    const middleware = geoRouteWatch();
    const req = makeReq({ path: "/health" });
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    res.emit("finish");

    expect(getHits()).toHaveLength(0);
    expect(next).toHaveBeenCalled();
  });

  it("ignores custom paths", () => {
    const middleware = geoRouteWatch({ ignore: ["/internal"] });
    const req = makeReq({ path: "/internal/metrics" });
    const res = makeRes();
    middleware(req, res, makeNext());
    res.emit("finish");

    expect(getHits()).toHaveLength(0);
  });

  it("records undefined country when no header present", () => {
    const middleware = geoRouteWatch();
    const req = makeReq({ headers: {} });
    const res = makeRes();
    middleware(req, res, makeNext());
    res.emit("finish");

    const hits = getHits();
    expect(hits[0].country).toBeUndefined();
  });
});
