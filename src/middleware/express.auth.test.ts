import { authRouteWatch } from "./express.auth";
import { getHits, clearHits } from "../tracker";

function makeReq(overrides: Partial<any> = {}): any {
  return {
    method: "GET",
    path: "/api/users",
    ...overrides,
  };
}

function makeRes(statusCode = 200): any {
  const listeners: Record<string, Function[]> = {};
  return {
    statusCode,
    on(event: string, cb: Function) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    },
    emit(event: string) {
      (listeners[event] || []).forEach((cb) => cb());
    },
  };
}

function makeNext(): jest.Mock {
  return jest.fn();
}

beforeEach(() => clearHits());

describe("authRouteWatch", () => {
  it("tracks authenticated requests with userId", () => {
    const middleware = authRouteWatch({
      getUserId: (req) => req.user?.id,
    });
    const req = makeReq({ user: { id: "user-42" } });
    const res = makeRes(200);
    const next = makeNext();

    middleware(req, res, next);
    res.emit("finish");

    const hits = getHits();
    expect(hits).toHaveLength(1);
    expect(hits[0].meta?.authenticated).toBe(true);
    expect(hits[0].meta?.userId).toBe("user-42");
    expect(next).toHaveBeenCalled();
  });

  it("tracks unauthenticated requests by default", () => {
    const middleware = authRouteWatch({ getUserId: () => undefined });
    const req = makeReq();
    const res = makeRes(401);
    const next = makeNext();

    middleware(req, res, next);
    res.emit("finish");

    const hits = getHits();
    expect(hits).toHaveLength(1);
    expect(hits[0].meta?.authenticated).toBe(false);
    expect(hits[0].meta?.userId).toBeUndefined();
  });

  it("skips unauthenticated requests when trackUnauthenticated is false", () => {
    const middleware = authRouteWatch({
      getUserId: () => undefined,
      trackUnauthenticated: false,
    });
    const req = makeReq();
    const res = makeRes(401);
    const next = makeNext();

    middleware(req, res, next);
    res.emit("finish");

    expect(getHits()).toHaveLength(0);
    expect(next).toHaveBeenCalled();
  });

  it("ignores paths in the ignore list", () => {
    const middleware = authRouteWatch({
      ignore: ["/health"],
      getUserId: (req) => req.user?.id,
    });
    const req = makeReq({ path: "/health" });
    const res = makeRes(200);
    const next = makeNext();

    middleware(req, res, next);
    res.emit("finish");

    expect(getHits()).toHaveLength(0);
    expect(next).toHaveBeenCalled();
  });
});
