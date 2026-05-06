import { payloadRouteWatch } from "./express.payload";
import * as tracker from "../tracker";

function makeReq(overrides: Partial<any> = {}): any {
  return {
    method: "POST",
    path: "/api/upload",
    headers: { "content-length": "512" },
    ...overrides,
  };
}

function makeRes(overrides: Partial<any> = {}): any {
  const listeners: Record<string, Function[]> = {};
  return {
    statusCode: 200,
    write: jest.fn(),
    end: jest.fn(),
    on(event: string, cb: Function) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(cb);
    },
    emit(event: string) {
      (listeners[event] || []).forEach((cb) => cb());
    },
    ...overrides,
  };
}

function makeNext(): jest.Mock {
  return jest.fn();
}

describe("payloadRouteWatch", () => {
  let trackSpy: jest.SpyInstance;

  beforeEach(() => {
    trackSpy = jest.spyOn(tracker, "trackHit").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("calls next()", () => {
    const middleware = payloadRouteWatch();
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("tracks a hit on response finish", () => {
    const middleware = payloadRouteWatch();
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    res.emit("finish");
    expect(trackSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/api/upload",
        statusCode: 200,
        requestBytes: 512,
      })
    );
  });

  it("ignores paths in the ignore list", () => {
    const middleware = payloadRouteWatch({ ignore: ["/health"] });
    const req = makeReq({ path: "/health" });
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    res.emit("finish");
    expect(trackSpy).not.toHaveBeenCalled();
  });

  it("skips tracking when payload is below threshold", () => {
    const middleware = payloadRouteWatch({ sizeThresholdBytes: 1024 });
    const req = makeReq({ headers: { "content-length": "100" } });
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    res.emit("finish");
    expect(trackSpy).not.toHaveBeenCalled();
  });

  it("tracks when payload meets threshold", () => {
    const middleware = payloadRouteWatch({ sizeThresholdBytes: 256 });
    const req = makeReq({ headers: { "content-length": "512" } });
    const res = makeRes();
    const next = makeNext();
    middleware(req, res, next);
    res.emit("finish");
    expect(trackSpy).toHaveBeenCalled();
  });
});
