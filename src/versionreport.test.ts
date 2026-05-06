import { generateVersionReport, formatVersionReportText } from "./versionreport";
import { RouteHit } from "./tracker";

function makeHit(overrides: Partial<RouteHit> = {}): RouteHit {
  return {
    method: "GET",
    path: "/v1/users",
    statusCode: 200,
    duration: 50,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("generateVersionReport", () => {
  it("groups hits by API version", () => {
    const hits = [
      makeHit({ path: "/v1/users" }),
      makeHit({ path: "/v1/posts" }),
      makeHit({ path: "/v2/users" }),
    ];
    const report = generateVersionReport(hits);
    const versions = report.versions.map((v) => v.version);
    expect(versions).toContain("v1");
    expect(versions).toContain("v2");
  });

  it("counts hits per version", () => {
    const hits = [
      makeHit({ path: "/v1/users" }),
      makeHit({ path: "/v1/orders" }),
      makeHit({ path: "/v2/users" }),
    ];
    const report = generateVersionReport(hits);
    const v1 = report.versions.find((v) => v.version === "v1")!;
    expect(v1.count).toBe(2);
  });

  it("tracks unique routes per version", () => {
    const hits = [
      makeHit({ path: "/v1/users", method: "GET" }),
      makeHit({ path: "/v1/users", method: "GET" }),
      makeHit({ path: "/v1/posts", method: "POST" }),
    ];
    const report = generateVersionReport(hits);
    const v1 = report.versions.find((v) => v.version === "v1")!;
    expect(v1.routes.size).toBe(2);
  });

  it("counts errors per version", () => {
    const hits = [
      makeHit({ path: "/v1/users", statusCode: 500 }),
      makeHit({ path: "/v1/users", statusCode: 200 }),
      makeHit({ path: "/v1/users", statusCode: 404 }),
    ];
    const report = generateVersionReport(hits);
    const v1 = report.versions.find((v) => v.version === "v1")!;
    expect(v1.errorCount).toBe(2);
  });

  it("computes average duration per version", () => {
    const hits = [
      makeHit({ path: "/v2/users", duration: 100 }),
      makeHit({ path: "/v2/users", duration: 200 }),
    ];
    const report = generateVersionReport(hits);
    const v2 = report.versions.find((v) => v.version === "v2")!;
    expect(v2.avgDuration).toBe(150);
  });

  it("labels paths without version prefix as unversioned", () => {
    const hits = [makeHit({ path: "/health" }), makeHit({ path: "/metrics" })];
    const report = generateVersionReport(hits);
    const unversioned = report.versions.find((v) => v.version === "unversioned")!;
    expect(unversioned).toBeDefined();
    expect(unversioned.count).toBe(2);
  });

  it("sorts versions by hit count descending", () => {
    const hits = [
      makeHit({ path: "/v2/users" }),
      makeHit({ path: "/v1/a" }),
      makeHit({ path: "/v1/b" }),
      makeHit({ path: "/v1/c" }),
    ];
    const report = generateVersionReport(hits);
    expect(report.versions[0].version).toBe("v1");
  });
});

describe("formatVersionReportText", () => {
  it("includes version labels and stats", () => {
    const hits = [makeHit({ path: "/v1/users" })];
    const report = generateVersionReport(hits);
    const text = formatVersionReportText(report);
    expect(text).toContain("[v1]");
    expect(text).toContain("Hits");
    expect(text).toContain("Errors");
    expect(text).toContain("Avg duration");
  });

  it("includes the generated timestamp", () => {
    const report = generateVersionReport([]);
    const text = formatVersionReportText(report);
    expect(text).toContain("RouteWatch Version Report");
  });
});
