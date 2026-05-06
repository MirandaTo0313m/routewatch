import { generateDeprecationReport, formatDeprecationReportText } from "./deprecationreport";
import { RouteHit } from "./tracker";

function makeHit(overrides: Partial<RouteHit> = {}): RouteHit {
  return {
    route: "/api/v1/users",
    method: "GET",
    statusCode: 200,
    duration: 50,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("generateDeprecationReport", () => {
  it("returns empty report when no hits", () => {
    const report = generateDeprecationReport([]);
    expect(report.totalDeprecatedHits).toBe(0);
    expect(report.uniqueDeprecatedRoutes).toBe(0);
    expect(report.entries).toHaveLength(0);
  });

  it("marks routes as deprecated using route key", () => {
    const hits = [
      makeHit({ route: "/api/v1/users", method: "GET" }),
      makeHit({ route: "/api/v1/users", method: "GET" }),
      makeHit({ route: "/api/v2/users", method: "GET" }),
    ];
    const deprecated = { "GET:/api/v1/users": "2024-01-01" };
    const report = generateDeprecationReport(hits, deprecated);

    expect(report.uniqueDeprecatedRoutes).toBe(1);
    expect(report.totalDeprecatedHits).toBe(2);
    const entry = report.entries.find((e) => e.route === "/api/v1/users");
    expect(entry?.deprecated).toBe(true);
    expect(entry?.deprecatedSince).toBe("2024-01-01");
  });

  it("marks routes as deprecated using bare route path", () => {
    const hits = [makeHit({ route: "/legacy/endpoint", method: "POST" })];
    const report = generateDeprecationReport(hits, { "/legacy/endpoint": "2023-06-15" });
    expect(report.uniqueDeprecatedRoutes).toBe(1);
    expect(report.entries[0].deprecatedSince).toBe("2023-06-15");
  });

  it("counts hits correctly across multiple routes", () => {
    const hits = [
      makeHit({ route: "/old", method: "GET" }),
      makeHit({ route: "/old", method: "GET" }),
      makeHit({ route: "/old", method: "GET" }),
      makeHit({ route: "/new", method: "GET" }),
    ];
    const report = generateDeprecationReport(hits, { "GET:/old": "2023-01-01" });
    expect(report.totalDeprecatedHits).toBe(3);
    expect(report.uniqueDeprecatedRoutes).toBe(1);
  });

  it("sorts entries by hits descending", () => {
    const hits = [
      makeHit({ route: "/a", method: "GET" }),
      makeHit({ route: "/b", method: "GET" }),
      makeHit({ route: "/b", method: "GET" }),
    ];
    const report = generateDeprecationReport(hits);
    expect(report.entries[0].route).toBe("/b");
  });

  it("tracks firstSeen and lastSeen timestamps", () => {
    const t1 = 1000;
    const t2 = 2000;
    const hits = [
      makeHit({ route: "/api", method: "GET", timestamp: t2 }),
      makeHit({ route: "/api", method: "GET", timestamp: t1 }),
    ];
    const report = generateDeprecationReport(hits);
    const entry = report.entries[0];
    expect(entry.firstSeen).toBe(t1);
    expect(entry.lastSeen).toBe(t2);
  });
});

describe("formatDeprecationReportText", () => {
  it("includes header and summary", () => {
    const report = generateDeprecationReport([]);
    const text = formatDeprecationReportText(report);
    expect(text).toContain("Deprecation Report");
    expect(text).toContain("No deprecated routes detected.");
  });

  it("lists deprecated routes with hit count and since date", () => {
    const hits = [makeHit({ route: "/old", method: "DELETE" })];
    const report = generateDeprecationReport(hits, { "DELETE:/old": "2024-03-01" });
    const text = formatDeprecationReportText(report);
    expect(text).toContain("[DELETE] /old");
    expect(text).toContain("2024-03-01");
    expect(text).toContain("1 hit(s)");
  });
});
