import { describe, it, expect } from "vitest";
import {
  generateBandwidthReport,
  formatBandwidthReportText,
  BandwidthHit,
} from "./bandwidthreport";

function makeHit(
  route: string,
  method: string,
  requestBytes: number,
  responseBytes: number,
  timestamp = Date.now()
): BandwidthHit {
  return { route, method, requestBytes, responseBytes, timestamp };
}

describe("generateBandwidthReport", () => {
  it("returns empty report for no hits", () => {
    const report = generateBandwidthReport([]);
    expect(report.totalHits).toBe(0);
    expect(report.totalBytes).toBe(0);
    expect(report.routes).toHaveLength(0);
  });

  it("aggregates hits per route+method", () => {
    const hits = [
      makeHit("/api/users", "GET", 100, 500),
      makeHit("/api/users", "GET", 200, 600),
      makeHit("/api/posts", "POST", 300, 200),
    ];
    const report = generateBandwidthReport(hits);
    expect(report.totalHits).toBe(3);
    expect(report.routes).toHaveLength(2);
  });

  it("computes totals and averages correctly", () => {
    const hits = [
      makeHit("/api/users", "GET", 100, 400),
      makeHit("/api/users", "GET", 300, 600),
    ];
    const report = generateBandwidthReport(hits);
    const route = report.routes[0];
    expect(route.totalRequestBytes).toBe(400);
    expect(route.totalResponseBytes).toBe(1000);
    expect(route.avgRequestBytes).toBe(200);
    expect(route.avgResponseBytes).toBe(500);
    expect(route.totalBytes).toBe(1400);
  });

  it("sorts routes by totalBytes descending", () => {
    const hits = [
      makeHit("/small", "GET", 10, 10),
      makeHit("/large", "GET", 1000, 2000),
      makeHit("/medium", "GET", 100, 200),
    ];
    const report = generateBandwidthReport(hits);
    expect(report.routes[0].route).toBe("/large");
    expect(report.routes[1].route).toBe("/medium");
    expect(report.routes[2].route).toBe("/small");
  });

  it("treats same route with different methods separately", () => {
    const hits = [
      makeHit("/api/data", "GET", 50, 200),
      makeHit("/api/data", "POST", 300, 100),
    ];
    const report = generateBandwidthReport(hits);
    expect(report.routes).toHaveLength(2);
  });

  it("sums global request and response bytes", () => {
    const hits = [
      makeHit("/a", "GET", 100, 200),
      makeHit("/b", "POST", 50, 150),
    ];
    const report = generateBandwidthReport(hits);
    expect(report.totalRequestBytes).toBe(150);
    expect(report.totalResponseBytes).toBe(350);
    expect(report.totalBytes).toBe(500);
  });
});

describe("formatBandwidthReportText", () => {
  it("includes header and route lines", () => {
    const hits = [makeHit("/api/test", "GET", 128, 512)];
    const report = generateBandwidthReport(hits);
    const text = formatBandwidthReportText(report);
    expect(text).toContain("Bandwidth Report");
    expect(text).toContain("/api/test");
    expect(text).toContain("GET");
    expect(text).toContain("total:");
  });

  it("shows zero totals for empty report", () => {
    const report = generateBandwidthReport([]);
    const text = formatBandwidthReportText(report);
    expect(text).toContain("Total Hits: 0");
    expect(text).toContain("Total Bytes: 0");
  });
});
