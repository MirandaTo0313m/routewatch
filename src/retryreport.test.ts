import { generateRetryReport, formatRetryReportText } from "./retryreport";
import { RouteHit } from "./tracker";

function makeHit(
  route: string,
  method = "GET",
  retryCount = 0,
  overrides: Partial<RouteHit> = {}
): RouteHit {
  return {
    route,
    method,
    statusCode: 200,
    durationMs: 10,
    timestamp: Date.now(),
    retryCount,
    ...overrides,
  };
}

describe("generateRetryReport", () => {
  it("returns zero rates when no retries", () => {
    const hits = [makeHit("/api/a"), makeHit("/api/b")];
    const report = generateRetryReport(hits);
    expect(report.totalRetries).toBe(0);
    expect(report.overallRetryRate).toBe(0);
    report.routes.forEach((r) => expect(r.retryRate).toBe(0));
  });

  it("counts retry hits correctly", () => {
    const hits = [
      makeHit("/api/x", "POST", 1),
      makeHit("/api/x", "POST", 0),
      makeHit("/api/x", "POST", 2),
    ];
    const report = generateRetryReport(hits);
    expect(report.totalRetries).toBe(2);
    expect(report.routes[0].retryHits).toBe(2);
    expect(report.routes[0].retryRate).toBeCloseTo(2 / 3);
  });

  it("groups by method and route separately", () => {
    const hits = [
      makeHit("/api/z", "GET", 1),
      makeHit("/api/z", "POST", 0),
    ];
    const report = generateRetryReport(hits);
    expect(report.routes).toHaveLength(2);
  });

  it("sorts routes by retry rate descending", () => {
    const hits = [
      makeHit("/low", "GET", 0),
      makeHit("/low", "GET", 0),
      makeHit("/high", "GET", 1),
    ];
    const report = generateRetryReport(hits);
    expect(report.routes[0].route).toBe("/high");
  });

  it("handles empty hits array", () => {
    const report = generateRetryReport([]);
    expect(report.totalHits).toBe(0);
    expect(report.overallRetryRate).toBe(0);
    expect(report.routes).toHaveLength(0);
  });
});

describe("formatRetryReportText", () => {
  it("includes header and route lines", () => {
    const hits = [makeHit("/api/test", "GET", 1), makeHit("/api/test", "GET", 0)];
    const report = generateRetryReport(hits);
    const text = formatRetryReportText(report);
    expect(text).toContain("RouteWatch Retry Report");
    expect(text).toContain("[GET] /api/test");
    expect(text).toContain("50.0%");
  });
});
