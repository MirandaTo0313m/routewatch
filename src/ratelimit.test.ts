import {
  detectRateLimitViolations,
  formatViolationMessage,
  RouteHitTimestamp,
  RateLimitConfig,
} from "./ratelimit";

const NOW = 1_700_000_000_000;

function makeHit(
  method: string,
  path: string,
  offsetMs = 0
): RouteHitTimestamp {
  return { method, path, timestamp: NOW - offsetMs };
}

const cfg: RateLimitConfig = { windowMs: 60_000, maxHits: 3 };

describe("detectRateLimitViolations", () => {
  it("returns empty array when no hits", () => {
    expect(detectRateLimitViolations([], cfg, NOW)).toEqual([]);
  });

  it("returns empty array when hits are below threshold", () => {
    const hits = [
      makeHit("GET", "/api/users"),
      makeHit("GET", "/api/users"),
    ];
    expect(detectRateLimitViolations(hits, cfg, NOW)).toEqual([]);
  });

  it("returns empty array when hits equal maxHits exactly", () => {
    const hits = Array.from({ length: 3 }, () => makeHit("GET", "/api/users"));
    expect(detectRateLimitViolations(hits, cfg, NOW)).toEqual([]);
  });

  it("detects a violation when hits exceed maxHits", () => {
    const hits = Array.from({ length: 5 }, () => makeHit("GET", "/api/users"));
    const violations = detectRateLimitViolations(hits, cfg, NOW);
    expect(violations).toHaveLength(1);
    expect(violations[0].method).toBe("GET");
    expect(violations[0].path).toBe("/api/users");
    expect(violations[0].hits).toBe(5);
  });

  it("ignores hits outside the time window", () => {
    const hits = [
      makeHit("POST", "/api/login", 0),
      makeHit("POST", "/api/login", 0),
      makeHit("POST", "/api/login", 0),
      makeHit("POST", "/api/login", 0),
      makeHit("POST", "/api/login", 120_000), // outside window
    ];
    const violations = detectRateLimitViolations(hits, cfg, NOW);
    expect(violations).toHaveLength(1);
    expect(violations[0].hits).toBe(4);
  });

  it("treats different methods as separate routes", () => {
    const hits = [
      ...Array.from({ length: 4 }, () => makeHit("GET", "/api/items")),
      ...Array.from({ length: 4 }, () => makeHit("POST", "/api/items")),
    ];
    const violations = detectRateLimitViolations(hits, cfg, NOW);
    expect(violations).toHaveLength(2);
  });

  it("sorts violations by hit count descending", () => {
    const hits = [
      ...Array.from({ length: 4 }, () => makeHit("GET", "/a")),
      ...Array.from({ length: 10 }, () => makeHit("GET", "/b")),
    ];
    const violations = detectRateLimitViolations(hits, cfg, NOW);
    expect(violations[0].path).toBe("/b");
    expect(violations[1].path).toBe("/a");
  });
});

describe("formatViolationMessage", () => {
  it("formats a human-readable message", () => {
    const msg = formatViolationMessage({
      method: "GET",
      path: "/api/users",
      hits: 150,
      windowMs: 60_000,
      maxHits: 100,
    });
    expect(msg).toContain("[RATE LIMIT]");
    expect(msg).toContain("GET /api/users");
    expect(msg).toContain("150 hits");
    expect(msg).toContain("60s");
    expect(msg).toContain("limit: 100");
  });
});
