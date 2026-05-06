import { generateGeoReport, formatGeoReportText } from "./georeport";
import { RouteHit } from "./tracker";

function makeHit(overrides: Partial<RouteHit> = {}): RouteHit {
  return {
    route: "/api/test",
    method: "GET",
    status: 200,
    duration: 50,
    timestamp: Date.now(),
    country: "US",
    ...overrides,
  };
}

describe("generateGeoReport", () => {
  it("returns empty report for no hits", () => {
    const report = generateGeoReport([]);
    expect(report.totalHits).toBe(0);
    expect(report.uniqueCountries).toBe(0);
    expect(report.byCountry).toEqual([]);
    expect(report.topCountry).toBeNull();
  });

  it("ignores hits without country", () => {
    const hits = [makeHit({ country: undefined }), makeHit({ country: "" })];
    const report = generateGeoReport(hits);
    expect(report.totalHits).toBe(0);
    expect(report.uniqueCountries).toBe(0);
  });

  it("aggregates hits by country", () => {
    const hits = [
      makeHit({ country: "US", duration: 100 }),
      makeHit({ country: "US", duration: 200 }),
      makeHit({ country: "DE", duration: 50 }),
    ];
    const report = generateGeoReport(hits);
    expect(report.totalHits).toBe(3);
    expect(report.uniqueCountries).toBe(2);
    expect(report.topCountry).toBe("US");

    const us = report.byCountry.find((c) => c.country === "US")!;
    expect(us.count).toBe(2);
    expect(us.avgDuration).toBe(150);
  });

  it("collects unique routes per country", () => {
    const hits = [
      makeHit({ country: "FR", route: "/a", method: "GET" }),
      makeHit({ country: "FR", route: "/a", method: "GET" }),
      makeHit({ country: "FR", route: "/b", method: "POST" }),
    ];
    const report = generateGeoReport(hits);
    const fr = report.byCountry.find((c) => c.country === "FR")!;
    expect(fr.routes).toHaveLength(2);
  });

  it("sorts countries by hit count descending", () => {
    const hits = [
      makeHit({ country: "CA" }),
      makeHit({ country: "US" }),
      makeHit({ country: "US" }),
      makeHit({ country: "US" }),
    ];
    const report = generateGeoReport(hits);
    expect(report.byCountry[0].country).toBe("US");
    expect(report.byCountry[1].country).toBe("CA");
  });
});

describe("formatGeoReportText", () => {
  it("formats report as readable text", () => {
    const hits = [makeHit({ country: "US", duration: 80 })];
    const report = generateGeoReport(hits);
    const text = formatGeoReportText(report);
    expect(text).toContain("=== Geo Report ===");
    expect(text).toContain("US");
    expect(text).toContain("1 hits");
    expect(text).toContain("avg 80ms");
  });

  it("shows N/A when no top country", () => {
    const report = generateGeoReport([]);
    const text = formatGeoReportText(report);
    expect(text).toContain("Top Country: N/A");
  });
});
