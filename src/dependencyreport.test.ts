import { generateDependencyReport, formatDependencyReportText } from "./dependencyreport";
import { RouteHit } from "./tracker";

function makeHit(
  route: string,
  method: string,
  statusCode: number,
  referer?: string,
  latency?: number
): RouteHit {
  return {
    route,
    method,
    statusCode,
    timestamp: Date.now(),
    referer,
    latency,
  } as any;
}

describe("generateDependencyReport", () => {
  it("returns empty report for no hits", () => {
    const report = generateDependencyReport([]);
    expect(report.totalRoutes).toBe(0);
    expect(report.dependencies).toHaveLength(0);
  });

  it("aggregates call counts per route+method", () => {
    const hits = [
      makeHit("/api/users", "GET", 200),
      makeHit("/api/users", "GET", 200),
      makeHit("/api/posts", "GET", 200),
    ];
    const report = generateDependencyReport(hits);
    expect(report.totalRoutes).toBe(2);
    const users = report.dependencies.find((d) => d.route === "/api/users");
    expect(users?.callCount).toBe(2);
  });

  it("collects unique calledBy referers", () => {
    const hits = [
      makeHit("/api/data", "GET", 200, "/dashboard"),
      makeHit("/api/data", "GET", 200, "/dashboard"),
      makeHit("/api/data", "GET", 200, "/profile"),
    ];
    const report = generateDependencyReport(hits);
    const dep = report.dependencies[0];
    expect(dep.calledBy).toHaveLength(2);
    expect(dep.calledBy).toContain("/dashboard");
    expect(dep.calledBy).toContain("/profile");
  });

  it("calculates error rate correctly", () => {
    const hits = [
      makeHit("/api/fail", "POST", 500),
      makeHit("/api/fail", "POST", 500),
      makeHit("/api/fail", "POST", 200),
      makeHit("/api/fail", "POST", 200),
    ];
    const report = generateDependencyReport(hits);
    const dep = report.dependencies[0];
    expect(dep.errorRate).toBeCloseTo(0.5);
  });

  it("calculates average latency", () => {
    const hits = [
      makeHit("/api/slow", "GET", 200, undefined, 100),
      makeHit("/api/slow", "GET", 200, undefined, 200),
    ];
    const report = generateDependencyReport(hits);
    expect(report.dependencies[0].avgLatency).toBeCloseTo(150);
  });

  it("sorts dependencies by call count descending", () => {
    const hits = [
      makeHit("/a", "GET", 200),
      makeHit("/b", "GET", 200),
      makeHit("/b", "GET", 200),
      makeHit("/b", "GET", 200),
    ];
    const report = generateDependencyReport(hits);
    expect(report.dependencies[0].route).toBe("/b");
  });
});

describe("formatDependencyReportText", () => {
  it("includes route, method, and stats", () => {
    const hits = [makeHit("/api/test", "GET", 200, "/home", 80)];
    const report = generateDependencyReport(hits);
    const text = formatDependencyReportText(report);
    expect(text).toContain("[GET] /api/test");
    expect(text).toContain("Calls");
    expect(text).toContain("/home");
  });

  it("shows (direct) when no referer", () => {
    const hits = [makeHit("/api/direct", "DELETE", 204)];
    const report = generateDependencyReport(hits);
    const text = formatDependencyReportText(report);
    expect(text).toContain("(direct)");
  });

  it("includes generatedAt timestamp", () => {
    const report = generateDependencyReport([]);
    const text = formatDependencyReportText(report);
    expect(text).toContain("RouteWatch Dependency Report");
  });
});
