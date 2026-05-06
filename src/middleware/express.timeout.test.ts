import { timeoutRouteWatch } from "./express.timeout";
import { getHits, clearHits } from "../tracker";

function makeReq(path: string, method = "GET", headers: Record<string, string> = {}) {
  return { path, method, headers, url: path } as any;
}

function makeRes(statusCode = 200) {
  const res: any = {
    statusCode,
    on: (event: string, cb: () => void) => {
      if (event === "finish") setTimeout(cb, 10);
      return res;
    },
  };
  return res;
}

function makeNext() {
  return jest.fn();
}

beforeEach(() => clearHits());

describe("timeoutRouteWatch", () => {
  it("records a hit with timedOut=false for fast responses", (done) => {
    const mw = timeoutRouteWatch({ timeoutMs: 500 });
    const req = makeReq("/api/fast");
    const res = makeRes(200);
    const next = makeNext();

    mw(req, res, next);
    expect(next).toHaveBeenCalled();

    setTimeout(() => {
      const hits = getHits();
      expect(hits.length).toBe(1);
      expect(hits[0].route).toBe("/api/fast");
      expect(hits[0].timedOut).toBe(false);
      done();
    }, 50);
  });

  it("records timedOut=true when response exceeds timeout", (done) => {
    const mw = timeoutRouteWatch({ timeoutMs: 30 });
    const req = makeReq("/api/slow");
    const res: any = {
      statusCode: 200,
      on: (event: string, cb: () => void) => {
        if (event === "finish") setTimeout(cb, 100);
        return res;
      },
    };
    const next = makeNext();

    mw(req, res, next);

    setTimeout(() => {
      const hits = getHits();
      expect(hits.length).toBe(1);
      expect(hits[0].timedOut).toBe(true);
      done();
    }, 150);
  });

  it("ignores paths in the ignore list", (done) => {
    const mw = timeoutRouteWatch({ timeoutMs: 500, ignore: ["/health"] });
    const req = makeReq("/health");
    const res = makeRes(200);
    const next = makeNext();

    mw(req, res, next);

    setTimeout(() => {
      expect(getHits().length).toBe(0);
      done();
    }, 50);
  });

  it("calls next() for all non-ignored routes", () => {
    const mw = timeoutRouteWatch({ timeoutMs: 500 });
    const req = makeReq("/api/data");
    const res = makeRes();
    const next = makeNext();
    mw(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
