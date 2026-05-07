import { describe, it, expect } from "vitest";
import {
  generateTraceReport,
  formatTraceReportText,
  TraceHit,
} from "./tracereport";

let idCounter = 0;
function makeHit(overrides: Partial<TraceHit> = {}): TraceHit {
  idCounter++;
  return {
    method: "GET",
    route: "/api/users",
    traceId: `trace-${idCounter}`,
    spanId: `span-${idCounter}`,
    durationMs: 50,
    statusCode: 200,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("generateTraceReport", () => {
  it("returns empty routes for no hits", () => {
    const report = generateTraceReport([]);
    expect(report.totalTraces).toBe(0);
    expect(report.routes).toHaveLength(0);
  });

  it("groups hits by method and route", () => {
    const hits = [
      makeHit({ route: "/api/users", method: "GET", durationMs: 40 }),
      makeHit({ route: "/api/users", method: "GET", durationMs: 60 }),
      makeHit({ route: "/api/orders", method: "POST", durationMs: 100 }),
    ];
    const report = generateTraceReport(hits);
    expect(report.totalTraces).toBe(3);
    expect(report.routes).toHaveLength(2);
  });

  it("calculates avg and max duration correctly", () => {
    const hits = [
      makeHit({ durationMs: 20 }),
      makeHit({ durationMs: 80 }),
    ];
    const report = generateTraceReport(hits);
    const r = report.routes[0];
    expect(r.avgDurationMs).toBe(50);
    expect(r.maxDurationMs).toBe(80);
  });

  it("sorts routes by avgDurationMs descending", () => {
    const hits = [
      makeHit({ route: "/fast", durationMs: 10 }),
      makeHit({ route: "/slow", durationMs: 200 }),
    ];
    const report = generateTraceReport(hits);
    expect(report.routes[0].route).toBe("/slow");
    expect(report.routes[1].route).toBe("/fast");
  });

  it("includes traceIds in route stats", () => {
    const hits = [
      makeHit({ traceId: "abc" }),
      makeHit({ traceId: "def" }),
    ];
    const report = generateTraceReport(hits);
    expect(report.routes[0].traceIds).toContain("abc");
    expect(report.routes[0].traceIds).toContain("def");
  });
});

describe("formatTraceReportText", () => {
  it("includes header and route lines", () => {
    const hits = [makeHit({ route: "/api/test", durationMs: 75 })];
    const report = generateTraceReport(hits);
    const text = formatTraceReportText(report);
    expect(text).toContain("Trace Report");
    expect(text).toContain("/api/test");
    expect(text).toContain("75");
  });

  it("shows total traces count", () => {
    const hits = [makeHit(), makeHit()];
    const report = generateTraceReport(hits);
    const text = formatTraceReportText(report);
    expect(text).toContain("Total Traces: 2");
  });
});
