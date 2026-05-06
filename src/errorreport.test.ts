import { describe, it, expect } from "vitest";
import { generateErrorReport, formatErrorReportText } from "./errorreport";
import { RouteHit } from "./tracker";

function makeHit(overrides: Partial<RouteHit> = {}): RouteHit {
  return {
    route: "/api/test",
    method: "GET",
    statusCode: 200,
    duration: 50,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("generateErrorReport", () => {
  it("returns zero error rate when all requests succeed", () => {
    const hits = [makeHit(), makeHit(), makeHit()];
    const report = generateErrorReport(hits);
    expect(report.totalErrors).toBe(0);
    expect(report.overallErrorRate).toBe(0);
  });

  it("counts 4xx and 5xx as errors", () => {
    const hits = [
      makeHit({ statusCode: 200 }),
      makeHit({ statusCode: 404 }),
      makeHit({ statusCode: 500 }),
    ];
    const report = generateErrorReport(hits);
    expect(report.totalErrors).toBe(2);
    expect(report.overallErrorRate).toBeCloseTo(2 / 3);
  });

  it("groups by route and method", () => {
    const hits = [
      makeHit({ route: "/a", method: "GET", statusCode: 200 }),
      makeHit({ route: "/a", method: "GET", statusCode: 500 }),
      makeHit({ route: "/b", method: "POST", statusCode: 400 }),
    ];
    const report = generateErrorReport(hits);
    expect(report.routes).toHaveLength(2);
    const routeA = report.routes.find((r) => r.route === "/a");
    expect(routeA?.errorHits).toBe(1);
    expect(routeA?.totalHits).toBe(2);
  });

  it("sorts routes by error rate descending", () => {
    const hits = [
      makeHit({ route: "/low", statusCode: 200 }),
      makeHit({ route: "/low", statusCode: 200 }),
      makeHit({ route: "/high", statusCode: 500 }),
    ];
    const report = generateErrorReport(hits);
    expect(report.routes[0].route).toBe("/high");
  });

  it("tracks individual status code counts", () => {
    const hits = [
      makeHit({ statusCode: 404 }),
      makeHit({ statusCode: 404 }),
      makeHit({ statusCode: 500 }),
    ];
    const report = generateErrorReport(hits);
    expect(report.routes[0].statusCodes[404]).toBe(2);
    expect(report.routes[0].statusCodes[500]).toBe(1);
  });

  it("handles empty hits array", () => {
    const report = generateErrorReport([]);
    expect(report.totalRequests).toBe(0);
    expect(report.overallErrorRate).toBe(0);
    expect(report.routes).toHaveLength(0);
  });
});

describe("formatErrorReportText", () => {
  it("includes header and totals", () => {
    const hits = [makeHit({ statusCode: 500 }), makeHit({ statusCode: 200 })];
    const report = generateErrorReport(hits);
    const text = formatErrorReportText(report);
    expect(text).toContain("RouteWatch Error Report");
    expect(text).toContain("Total Requests : 2");
    expect(text).toContain("Total Errors   : 1");
  });

  it("includes per-route error info", () => {
    const hits = [makeHit({ route: "/api/test", statusCode: 404 })];
    const report = generateErrorReport(hits);
    const text = formatErrorReportText(report);
    expect(text).toContain("/api/test");
    expect(text).toContain("100.0%");
  });
});
