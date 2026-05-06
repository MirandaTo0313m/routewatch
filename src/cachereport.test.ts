import { generateCacheReport, formatCacheReportText } from "./cachereport";
import { CacheHitInfo } from "./middleware/express.cache";

function makeHit(
  route = "/api/data",
  method = "GET",
  cacheStatus: CacheHitInfo["cacheStatus"] = "HIT",
  timestamp = Date.now()
): CacheHitInfo {
  return { route, method, cacheStatus, timestamp };
}

describe("generateCacheReport", () => {
  it("returns zeros for empty input", () => {
    const report = generateCacheReport([]);
    expect(report.total).toBe(0);
    expect(report.hitRate).toBe(0);
    expect(report.topCachedRoutes).toHaveLength(0);
  });

  it("counts hits and misses correctly", () => {
    const hits = [
      makeHit("/a", "GET", "HIT"),
      makeHit("/a", "GET", "HIT"),
      makeHit("/b", "GET", "MISS"),
    ];
    const report = generateCacheReport(hits);
    expect(report.total).toBe(3);
    expect(report.hits).toBe(2);
    expect(report.misses).toBe(1);
    expect(report.bypasses).toBe(0);
    expect(report.unknown).toBe(0);
  });

  it("calculates hit rate", () => {
    const hits = [
      makeHit("/a", "GET", "HIT"),
      makeHit("/b", "GET", "MISS"),
    ];
    const report = generateCacheReport(hits);
    expect(report.hitRate).toBeCloseTo(0.5);
  });

  it("counts bypass and unknown", () => {
    const hits = [
      makeHit("/a", "GET", "BYPASS"),
      makeHit("/b", "GET", "UNKNOWN"),
    ];
    const report = generateCacheReport(hits);
    expect(report.bypasses).toBe(1);
    expect(report.unknown).toBe(1);
  });

  it("returns top cached routes sorted by count", () => {
    const hits = [
      makeHit("/a", "GET", "HIT"),
      makeHit("/a", "GET", "HIT"),
      makeHit("/b", "GET", "HIT"),
    ];
    const report = generateCacheReport(hits);
    expect(report.topCachedRoutes[0].route).toBe("/a");
    expect(report.topCachedRoutes[0].count).toBe(2);
  });

  it("limits top routes to 5", () => {
    const routes = ["/a", "/b", "/c", "/d", "/e", "/f"];
    const hits = routes.map((r) => makeHit(r, "GET", "HIT"));
    const report = generateCacheReport(hits);
    expect(report.topCachedRoutes.length).toBeLessThanOrEqual(5);
  });
});

describe("formatCacheReportText", () => {
  it("includes header and stats", () => {
    const report = generateCacheReport([
      makeHit("/api", "GET", "HIT"),
      makeHit("/api", "GET", "MISS"),
    ]);
    const text = formatCacheReportText(report);
    expect(text).toContain("Cache Report");
    expect(text).toContain("50.0%");
    expect(text).toContain("Total tracked: 2");
  });

  it("lists top cached routes", () => {
    const report = generateCacheReport([
      makeHit("/items", "GET", "HIT"),
      makeHit("/items", "GET", "HIT"),
    ]);
    const text = formatCacheReportText(report);
    expect(text).toContain("/items");
    expect(text).toContain("2 hits");
  });

  it("omits top routes section when no HITs", () => {
    const report = generateCacheReport([makeHit("/x", "GET", "MISS")]);
    const text = formatCacheReportText(report);
    expect(text).not.toContain("Top cached routes");
  });
});
