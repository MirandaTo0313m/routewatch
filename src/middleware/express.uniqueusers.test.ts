import { uniqueUsersWatch, getUniqueUserHits, clearUniqueUserHitStore } from "./express.uniqueusers";
import { EventEmitter } from "events";

function makeReq(overrides: Partial<any> = {}): any {
  return {
    path: "/api/data",
    method: "GET",
    headers: {},
    route: { path: "/api/data" },
    ...overrides,
  };
}

function makeRes(statusCode = 200): any {
  const emitter = new EventEmitter();
  return Object.assign(emitter, { statusCode });
}

function makeNext(): jest.Mock {
  return jest.fn();
}

beforeEach(() => {
  clearUniqueUserHitStore();
});

describe("uniqueUsersWatch", () => {
  it("records a hit when userId is resolved from authorization header", () => {
    const mw = uniqueUsersWatch();
    const req = makeReq({ headers: { authorization: "Bearer token123" } });
    const res = makeRes(200);
    const next = makeNext();

    mw(req, res, next);
    res.emit("finish");

    expect(next).toHaveBeenCalled();
    const hits = getUniqueUserHits();
    expect(hits).toHaveLength(1);
    expect(hits[0].userId).toBe("Bearer token123");
    expect(hits[0].route).toBe("/api/data");
    expect(hits[0].method).toBe("GET");
    expect(hits[0].statusCode).toBe(200);
  });

  it("skips recording when no userId is resolved", () => {
    const mw = uniqueUsersWatch();
    const req = makeReq({ headers: {} });
    const res = makeRes(200);
    const next = makeNext();

    mw(req, res, next);
    res.emit("finish");

    expect(next).toHaveBeenCalled();
    expect(getUniqueUserHits()).toHaveLength(0);
  });

  it("uses custom resolveUserId", () => {
    const mw = uniqueUsersWatch({ resolveUserId: (req) => req.headers["x-user-id"] });
    const req = makeReq({ headers: { "x-user-id": "user-42" } });
    const res = makeRes(201);
    const next = makeNext();

    mw(req, res, next);
    res.emit("finish");

    const hits = getUniqueUserHits();
    expect(hits).toHaveLength(1);
    expect(hits[0].userId).toBe("user-42");
    expect(hits[0].statusCode).toBe(201);
  });

  it("ignores paths in the ignore list", () => {
    const mw = uniqueUsersWatch({ ignore: ["/health"] });
    const req = makeReq({ path: "/health", headers: { authorization: "Bearer abc" } });
    const res = makeRes(200);
    const next = makeNext();

    mw(req, res, next);
    res.emit("finish");

    expect(next).toHaveBeenCalled();
    expect(getUniqueUserHits()).toHaveLength(0);
  });

  it("records multiple hits from different users", () => {
    const mw = uniqueUsersWatch({ resolveUserId: (req) => req.headers["x-user-id"] });

    for (const uid of ["u1", "u2", "u1"]) {
      const req = makeReq({ headers: { "x-user-id": uid } });
      const res = makeRes(200);
      mw(req, res, makeNext());
      res.emit("finish");
    }

    const hits = getUniqueUserHits();
    expect(hits).toHaveLength(3);
    const userIds = hits.map((h) => h.userId);
    expect(userIds.filter((id) => id === "u1")).toHaveLength(2);
    expect(userIds.filter((id) => id === "u2")).toHaveLength(1);
  });
});
