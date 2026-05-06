import { cacheRouteWatch, clearCacheHitStore, getCacheHits } from "./express.cache";
import * as tracker from "../tracker";

function makeReq(path = "/api/data", method = "GET"): any {
  return { path, method, url: path };
}

function makeRes(statusCode = 200, cacheHeader?: string): any {
  const headers: Record<string, string> = {};
  if (cacheHeader) headers["x-cache"] = cacheHeader;
  const listeners: Record<string, Function> = {};
  return {
    statusCode,
    getHeader: (name: string) => headers[name.toLowerCase()] ?? null,
    on: (event: string, fn: Function) => { listeners[event] = fn; },
    finish: () => listeners["finish"]?.(),
  };
}

function makeNext(): jest.Mock {
  return jest.fn();
}

describe("cacheRouteWatch", () => {
  beforeEach(() => {
    clearCacheHitStore();
    jest.spyOn(tracker, "trackHit").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls next()", () => {
    const mw = cacheRouteWatch();
    const next = makeNext();
    const req = makeReq();
    const res = makeRes();
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("tracks a hit on finish", () => {
    const mw = cacheRouteWatch();
    const req = makeReq("/api/items");
    const res = makeRes(200);
    mw(req, res, makeNext());
    res.finish();
    expect(tracker.trackHit).toHaveBeenCalledWith(
      expect.objectContaining({ route: "/api/items", method: "GET", statusCode: 200 })
    );
  });

  it("records MISS cache status", () => {
    const mw = cacheRouteWatch();
    const req = makeReq("/api/items");
    const res = makeRes(200, "MISS");
    mw(req, res, makeNext());
    res.finish();
    const hits = getCacheHits();
    expect(hits[0].cacheStatus).toBe("MISS");
  });

  it("records HIT cache status", () => {
    const mw = cacheRouteWatch();
    const res = makeRes(200, "HIT");
    mw(makeReq(), res, makeNext());
    res.finish();
    expect(getCacheHits()[0].cacheStatus).toBe("HIT");
  });

  it("ignores specified routes", () => {
    const mw = cacheRouteWatch({ ignore: ["/health"] });
    const next = makeNext();
    mw(makeReq("/health"), makeRes(), next);
    expect(tracker.trackHit).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("records UNKNOWN when no cache header present", () => {
    const mw = cacheRouteWatch();
    const res = makeRes(200);
    mw(makeReq(), res, makeNext());
    res.finish();
    expect(getCacheHits()[0].cacheStatus).toBe("UNKNOWN");
  });

  it("skips cache tracking when trackCacheHeaders is false", () => {
    const mw = cacheRouteWatch({ trackCacheHeaders: false });
    const res = makeRes(200, "HIT");
    mw(makeReq(), res, makeNext());
    res.finish();
    expect(getCacheHits()).toHaveLength(0);
  });
});
