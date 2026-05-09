import { describe, it, expect } from "vitest";
import { generateBandwidthReport, formatBandwidthReportText } from "./bandwidthreport";
import { RouteHit } from "./tracker";

function makeHit(overrides: Partial<RouteHit> = {}): RouteHit {
  return {
    route: "/api/data",
    method: "GET",
    statusCode: 200,
    duration: 10,
    timestamp: Date.now(),
    requestBytes: 512,
    responseBytes: 2048,
    ...overrides,
  };
}

describe("generateBandwidthReport", () => {
  it("returns empty entries for no hits", () => {
    const report = generateBandwidthReport([]);
    expect(report.entries).toHaveLength(0);
    expect(report.totalRequestBytes).toBe(0);
    expect(report.totalResponseBytes).toBe(0);
  });

  it("aggregates bytes per route+method", () => {
    const hits = [
      makeHit({ route: "/api/users", method: "GET", requestBytes: 100, responseBytes: 500 }),
      makeHit({ route: "/api/users", method: "GET", requestBytes: 200, responseBytes: 1000 }),
      makeHit({ route: "/api/users", method: "POST", requestBytes: 400, responseBytes: 200 }),
    ];
    const report = generateBandwidthReport(hits);
    const getEntry = report.entries.find((e) => e.method === "GET" && e.route === "/api/users");
    expect(getEntry).toBeDefined();
    expect(getEntry!.totalRequestBytes).toBe(300);
    expect(getEntry!.totalResponseBytes).toBe(1500);
    expect(getEntry!.hitCount).toBe(2);
    expect(getEntry!.avgRequestBytes).toBe(150);
    expect(getEntry!.avgResponseBytes).toBe(750);
  });

  it("computes totals across all routes", () => {
    const hits = [
      makeHit({ requestBytes: 100, responseBytes: 200 }),
      makeHit({ route: "/api/other", requestBytes: 300, responseBytes: 400 }),
    ];
    const report = generateBandwidthReport(hits);
    expect(report.totalRequestBytes).toBe(400);
    expect(report.totalResponseBytes).toBe(600);
  });

  it("sorts entries by totalResponseBytes descending", () => {
    const hits = [
      makeHit({ route: "/small", responseBytes: 100 }),
      makeHit({ route: "/large", responseBytes: 9000 }),
      makeHit({ route: "/medium", responseBytes: 500 }),
    ];
    const report = generateBandwidthReport(hits);
    expect(report.entries[0].route).toBe("/large");
    expect(report.entries[1].route).toBe("/medium");
    expect(report.entries[2].route).toBe("/small");
  });

  it("handles missing requestBytes / responseBytes gracefully", () => {
    const hit = makeHit({ requestBytes: undefined, responseBytes: undefined });
    const report = generateBandwidthReport([hit]);
    expect(report.entries[0].totalRequestBytes).toBe(0);
    expect(report.entries[0].totalResponseBytes).toBe(0);
  });
});

describe("formatBandwidthReportText", () => {
  it("includes header and generatedAt", () => {
    const report = generateBandwidthReport([makeHit()]);
    const text = formatBandwidthReportText(report);
    expect(text).toContain("Bandwidth Report");
    expect(text).toContain(report.generatedAt);
  });

  it("lists route entries", () => {
    const hits = [makeHit({ route: "/api/data", method: "GET", responseBytes: 2048 })];
    const report = generateBandwidthReport(hits);
    const text = formatBandwidthReportText(report);
    expect(text).toContain("/api/data");
    expect(text).toContain("GET");
  });

  it("formats bytes in human-readable units", () => {
    const hits = [makeHit({ requestBytes: 2048, responseBytes: 1_100_000 })];
    const report = generateBandwidthReport(hits);
    const text = formatBandwidthReportText(report);
    expect(text).toContain("KB");
    expect(text).toContain("MB");
  });
});
