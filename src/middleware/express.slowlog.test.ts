import { slowLogWatch, getSlowHits, clearSlowHits } from "./express.slowlog";
import { EventEmitter } from "events";

function makeReq(method = "GET", path = "/api/data"): any {
  return { method, path };
}

function makeRes(statusCode = 200): any {
  const emitter = new EventEmitter();
  return Object.assign(emitter, { statusCode });
}

function makeNext(): jest.Mock {
  return jest.fn();
}

describe("slowLogWatch", () => {
  beforeEach(() => {
    clearSlowHits();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls next()", () => {
    const middleware = slowLogWatch();
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("records a slow hit when duration exceeds threshold", () => {
    const middleware = slowLogWatch({ thresholdMs: 500 });
    const req = makeReq("POST", "/api/slow");
    const res = makeRes(200);
    const next = makeNext();

    const startSpy = jest.spyOn(Date, "now");
    startSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1600);

    middleware(req, res, next);
    res.emit("finish");

    const hits = getSlowHits();
    expect(hits).toHaveLength(1);
    expect(hits[0].route).toBe("/api/slow");
    expect(hits[0].method).toBe("POST");
    expect(hits[0].durationMs).toBe(600);
    expect(hits[0].statusCode).toBe(200);

    startSpy.mockRestore();
  });

  it("does not record a hit when duration is below threshold", () => {
    const middleware = slowLogWatch({ thresholdMs: 1000 });
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    const startSpy = jest.spyOn(Date, "now");
    startSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1200);

    middleware(req, res, next);
    res.emit("finish");

    expect(getSlowHits()).toHaveLength(0);
    startSpy.mockRestore();
  });

  it("ignores paths in the ignore list", () => {
    const middleware = slowLogWatch({ thresholdMs: 0, ignore: ["/health"] });
    const req = makeReq("GET", "/health");
    const res = makeRes();
    const next = makeNext();

    middleware(req, res, next);
    res.emit("finish");

    expect(getSlowHits()).toHaveLength(0);
    expect(next).toHaveBeenCalled();
  });

  it("calls onSlow callback when a slow request is detected", () => {
    const onSlow = jest.fn();
    const middleware = slowLogWatch({ thresholdMs: 100, onSlow });
    const req = makeReq("GET", "/api/slow");
    const res = makeRes(503);
    const next = makeNext();

    const startSpy = jest.spyOn(Date, "now");
    startSpy.mockReturnValueOnce(2000).mockReturnValueOnce(2300);

    middleware(req, res, next);
    res.emit("finish");

    expect(onSlow).toHaveBeenCalledWith("/api/slow", "GET", 300);
    startSpy.mockRestore();
  });
});
