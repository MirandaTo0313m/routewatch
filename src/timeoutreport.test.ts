import { generateTimeoutReport, formatTimeoutReportText } from "./timeoutreport";
import { RouteHit } from "./tracker";

function makeHit(overrides: Partial<RouteHit> = {}): RouteHit {
  return {
    method: "GET",
    route: "/api/test",
    statusCode: 200,
    durationMs: 50,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("generateTimeoutReport", () => {
  it("returns empty entries for no hits", () => {
    const report = generateTimeoutReport([]);
    expect(report.entries).toHaveLength(0);
    expect(report.totalRequests).toBe(0);
    expect(report.totalTimeouts).toBe(0);
  });

  it("counts timeouts by statusCode 408", () => {
    const hits = [
      makeHit({ route: "/api/slow", statusCode: 408, durationMs: 5000 }),
      makeHit({ route: "/api/slow", statusCode: 200, durationMs: 100 }),
    ];
    const report = generateTimeoutReport(hits);
    expect(report.totalTimeouts).toBe(1);
    const entry = report.entries.find((e) => e.route === "/api/slow");
    expect(entry).toBeDefined();
    expect(entry!.timeouts).toBe(1);
    expect(entry!.totalRequests).toBe(2);
    expect(entry!.timeoutRate).toBeCloseTo(0.5);
  });

  it("counts timeouts by meta.timeout flag", () => {
    const hits = [
      makeHit({ route: "/api/data", meta: { timeout: true }, durationMs: 3000 }),
      makeHit({ route: "/api/data", meta: { timeout: false }, durationMs: 80 }),
      makeHit({ route: "/api/data", meta: { timeout: false }, durationMs: 60 }),
    ];
    const report = generateTimeoutReport(hits);
    const entry = report.entries.find((e) => e.route === "/api/data");
    expect(entry!.timeouts).toBe(1);
    expect(entry!.timeoutRate).toBeCloseTo(1 / 3);
  });

  it("calculates avgDurationMs correctly", () => {
    const hits = [
      makeHit({ route: "/ping", durationMs: 100 }),
      makeHit({ route: "/ping", durationMs: 200 }),
    ];
    const report = generateTimeoutReport(hits);
    expect(report.entries[0].avgDurationMs).toBe(150);
  });

  it("sorts entries by timeoutRate descending", () => {
    const hits = [
      makeHit({ route: "/a", statusCode: 200 }),
      makeHit({ route: "/b", statusCode: 408 }),
      makeHit({ route: "/b", statusCode: 408 }),
    ];
    const report = generateTimeoutReport(hits);
    expect(report.entries[0].route).toBe("/b");
  });

  it("groups by method and route separately", () => {
    const hits = [
      makeHit({ method: "GET", route: "/api/items" }),
      makeHit({ method: "POST", route: "/api/items" }),
    ];
    const report = generateTimeoutReport(hits);
    expect(report.entries).toHaveLength(2);
  });
});

describe("formatTimeoutReportText", () => {
  it("includes header and route data", () => {
    const hits = [
      makeHit({ route: "/api/slow", statusCode: 408, durationMs: 3000 }),
      makeHit({ route: "/api/slow", statusCode: 200, durationMs: 100 }),
    ];
    const report = generateTimeoutReport(hits);
    const text = formatTimeoutReportText(report);
    expect(text).toContain("RouteWatch Timeout Report");
    expect(text).toContain("/api/slow");
    expect(text).toContain("50.0%");
    expect(text).toContain("Total Timeouts : 1");
  });

  it("returns a non-empty string for empty report", () => {
    const report = generateTimeoutReport([]);
    const text = formatTimeoutReportText(report);
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });
});
