import { generateStatusCodeReport, formatStatusCodeReportText } from "./statuscodereport";
import { StatusCodeHit } from "./middleware/express.statuscode";

function makeHit(route: string, method: string, statusCode: number, durationMs = 50): StatusCodeHit {
  return { route, method, statusCode, durationMs, timestamp: Date.now() };
}

describe("generateStatusCodeReport", () => {
  it("returns zero total for empty hits", () => {
    const report = generateStatusCodeReport([]);
    expect(report.total).toBe(0);
    expect(report.buckets).toHaveLength(0);
    expect(report.topErrorRoutes).toHaveLength(0);
  });

  it("correctly buckets 2xx responses", () => {
    const hits = [makeHit("/api/a", "GET", 200), makeHit("/api/b", "POST", 201)];
    const report = generateStatusCodeReport(hits);
    const bucket2xx = report.buckets.find((b) => b.range === "2xx");
    expect(bucket2xx?.count).toBe(2);
  });

  it("correctly buckets 4xx and 5xx responses", () => {
    const hits = [
      makeHit("/api/a", "GET", 404),
      makeHit("/api/b", "GET", 500),
      makeHit("/api/b", "GET", 500),
    ];
    const report = generateStatusCodeReport(hits);
    const bucket4xx = report.buckets.find((b) => b.range === "4xx");
    const bucket5xx = report.buckets.find((b) => b.range === "5xx");
    expect(bucket4xx?.count).toBe(1);
    expect(bucket5xx?.count).toBe(2);
  });

  it("lists top error routes sorted by count descending", () => {
    const hits = [
      makeHit("/api/a", "GET", 500),
      makeHit("/api/a", "GET", 500),
      makeHit("/api/b", "GET", 404),
    ];
    const report = generateStatusCodeReport(hits);
    expect(report.topErrorRoutes[0].route).toBe("/api/a");
    expect(report.topErrorRoutes[0].count).toBe(2);
  });

  it("does not include 2xx routes in topErrorRoutes", () => {
    const hits = [makeHit("/api/ok", "GET", 200), makeHit("/api/ok", "GET", 200)];
    const report = generateStatusCodeReport(hits);
    expect(report.topErrorRoutes).toHaveLength(0);
  });

  it("sets total correctly", () => {
    const hits = Array.from({ length: 7 }, (_, i) => makeHit(`/api/${i}`, "GET", 200));
    const report = generateStatusCodeReport(hits);
    expect(report.total).toBe(7);
  });
});

describe("formatStatusCodeReportText", () => {
  it("includes header and total", () => {
    const report = generateStatusCodeReport([makeHit("/api/a", "GET", 200)]);
    const text = formatStatusCodeReportText(report);
    expect(text).toContain("Status Code Report");
    expect(text).toContain("Total requests: 1");
  });

  it("includes bucket summary", () => {
    const report = generateStatusCodeReport([makeHit("/api/a", "GET", 404)]);
    const text = formatStatusCodeReportText(report);
    expect(text).toContain("4xx: 1");
  });

  it("includes top error routes when present", () => {
    const hits = [makeHit("/api/fail", "POST", 500)];
    const report = generateStatusCodeReport(hits);
    const text = formatStatusCodeReportText(report);
    expect(text).toContain("/api/fail");
    expect(text).toContain("1 errors");
  });

  it("omits error section when no errors", () => {
    const report = generateStatusCodeReport([makeHit("/api/ok", "GET", 200)]);
    const text = formatStatusCodeReportText(report);
    expect(text).not.toContain("Top error routes");
  });
});
