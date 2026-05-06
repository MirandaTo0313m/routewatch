import { generateSlowLogReport, formatSlowLogReportText } from "./slowlogreport";
import { RouteHit } from "./tracker";

function makeHit(
  route: string,
  method: string,
  duration: number,
  overrides: Partial<RouteHit> = {}
): RouteHit {
  return {
    route,
    method,
    status: 200,
    duration,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("generateSlowLogReport", () => {
  it("returns empty report when no hits exceed threshold", () => {
    const hits = [makeHit("/fast", "GET", 100)];
    const report = generateSlowLogReport(hits, 500);
    expect(report.totalSlowHits).toBe(0);
    expect(report.uniqueRoutes).toBe(0);
    expect(report.routes).toHaveLength(0);
  });

  it("includes hits that meet or exceed the threshold", () => {
    const hits = [
      makeHit("/api/users", "GET", 600),
      makeHit("/api/users", "GET", 500),
      makeHit("/api/users", "GET", 499),
    ];
    const report = generateSlowLogReport(hits, 500);
    expect(report.totalSlowHits).toBe(2);
    expect(report.uniqueRoutes).toBe(1);
  });

  it("computes avg, min, max correctly", () => {
    const hits = [
      makeHit("/slow", "POST", 600),
      makeHit("/slow", "POST", 800),
      makeHit("/slow", "POST", 1000),
    ];
    const report = generateSlowLogReport(hits, 500);
    const r = report.routes[0];
    expect(r.minDuration).toBe(600);
    expect(r.maxDuration).toBe(1000);
    expect(r.avgDuration).toBe(800);
    expect(r.count).toBe(3);
  });

  it("computes p95 duration", () => {
    const durations = Array.from({ length: 20 }, (_, i) => 500 + i * 10);
    const hits = durations.map((d) => makeHit("/p95", "GET", d));
    const report = generateSlowLogReport(hits, 500);
    const r = report.routes[0];
    expect(r.p95Duration).toBeGreaterThanOrEqual(680);
  });

  it("groups by method and route separately", () => {
    const hits = [
      makeHit("/api", "GET", 600),
      makeHit("/api", "POST", 700),
    ];
    const report = generateSlowLogReport(hits, 500);
    expect(report.uniqueRoutes).toBe(2);
  });

  it("sorts routes by average duration descending", () => {
    const hits = [
      makeHit("/a", "GET", 600),
      makeHit("/b", "GET", 1200),
    ];
    const report = generateSlowLogReport(hits, 500);
    expect(report.routes[0].route).toBe("/b");
    expect(report.routes[1].route).toBe("/a");
  });

  it("uses default threshold of 500ms", () => {
    const hits = [makeHit("/x", "GET", 501)];
    const report = generateSlowLogReport(hits);
    expect(report.thresholdMs).toBe(500);
    expect(report.totalSlowHits).toBe(1);
  });
});

describe("formatSlowLogReportText", () => {
  it("includes header and threshold info", () => {
    const report = generateSlowLogReport([], 500);
    const text = formatSlowLogReportText(report);
    expect(text).toContain("Slow Log Report");
    expect(text).toContain("500ms");
  });

  it("shows no slow routes message when empty", () => {
    const report = generateSlowLogReport([]);
    const text = formatSlowLogReportText(report);
    expect(text).toContain("No slow routes detected.");
  });

  it("lists route stats in output", () => {
    const hits = [makeHit("/api/orders", "GET", 750)];
    const report = generateSlowLogReport(hits, 500);
    const text = formatSlowLogReportText(report);
    expect(text).toContain("/api/orders");
    expect(text).toContain("GET");
    expect(text).toContain("750ms");
  });
});
