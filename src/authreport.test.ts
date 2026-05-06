import { generateAuthReport, formatAuthReportText } from "./authreport";
import { RouteHit } from "./tracker";

function makeHit(overrides: Partial<RouteHit> = {}): RouteHit {
  return {
    method: "GET",
    path: "/api/resource",
    statusCode: 200,
    duration: 10,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe("generateAuthReport", () => {
  it("returns empty array when no hits have auth metadata", () => {
    const hits = [makeHit(), makeHit()];
    expect(generateAuthReport(hits)).toEqual([]);
  });

  it("calculates auth stats correctly", () => {
    const hits = [
      makeHit({ meta: { authenticated: true, userId: "u1" } }),
      makeHit({ meta: { authenticated: true, userId: "u2" } }),
      makeHit({ meta: { authenticated: false } }),
    ];
    const report = generateAuthReport(hits);
    expect(report).toHaveLength(1);
    expect(report[0].totalHits).toBe(3);
    expect(report[0].authenticatedHits).toBe(2);
    expect(report[0].unauthenticatedHits).toBe(1);
    expect(report[0].authRate).toBe(0.67);
  });

  it("groups hits by method and path", () => {
    const hits = [
      makeHit({ method: "GET", path: "/a", meta: { authenticated: true } }),
      makeHit({ method: "POST", path: "/a", meta: { authenticated: false } }),
      makeHit({ method: "GET", path: "/a", meta: { authenticated: false } }),
    ];
    const report = generateAuthReport(hits);
    expect(report).toHaveLength(2);
    const getRoute = report.find((r) => r.method === "GET");
    expect(getRoute?.totalHits).toBe(2);
    const postRoute = report.find((r) => r.method === "POST");
    expect(postRoute?.totalHits).toBe(1);
  });

  it("sorts results by totalHits descending", () => {
    const hits = [
      makeHit({ path: "/low", meta: { authenticated: true } }),
      makeHit({ path: "/high", meta: { authenticated: true } }),
      makeHit({ path: "/high", meta: { authenticated: false } }),
    ];
    const report = generateAuthReport(hits);
    expect(report[0].route).toBe("/high");
    expect(report[1].route).toBe("/low");
  });
});

describe("formatAuthReportText", () => {
  it("returns fallback message for empty stats", () => {
    expect(formatAuthReportText([])).toContain("No authenticated route data");
  });

  it("includes route, method, and percentages", () => {
    const stats = [
      {
        route: "/api/users",
        method: "GET",
        totalHits: 10,
        authenticatedHits: 8,
        unauthenticatedHits: 2,
        authRate: 0.8,
      },
    ];
    const text = formatAuthReportText(stats);
    expect(text).toContain("GET /api/users");
    expect(text).toContain("10 hits");
    expect(text).toContain("80%");
  });
});
