import { describe, it, expect } from "vitest";
import {
  generateUniqueUsersReport,
  formatUniqueUsersReportText,
  UniqueUserHit,
} from "./uniqueusersreport";

function makeHit(
  overrides: Partial<UniqueUserHit> = {}
): UniqueUserHit {
  return {
    route: "/api/items",
    method: "GET",
    userId: "user-1",
    timestamp: Date.now(),
    statusCode: 200,
    ...overrides,
  };
}

describe("generateUniqueUsersReport", () => {
  it("returns empty report for no hits", () => {
    const report = generateUniqueUsersReport([]);
    expect(report.totalUniqueUsers).toBe(0);
    expect(report.totalRequests).toBe(0);
    expect(report.routes).toHaveLength(0);
  });

  it("counts unique users per route", () => {
    const hits = [
      makeHit({ userId: "user-1" }),
      makeHit({ userId: "user-2" }),
      makeHit({ userId: "user-1" }),
    ];
    const report = generateUniqueUsersReport(hits);
    expect(report.routes[0].uniqueUsers).toBe(2);
    expect(report.routes[0].totalRequests).toBe(3);
  });

  it("groups by route and method", () => {
    const hits = [
      makeHit({ route: "/api/items", method: "GET", userId: "u1" }),
      makeHit({ route: "/api/items", method: "POST", userId: "u2" }),
      makeHit({ route: "/api/orders", method: "GET", userId: "u1" }),
    ];
    const report = generateUniqueUsersReport(hits);
    expect(report.routes).toHaveLength(3);
  });

  it("calculates global unique users across all routes", () => {
    const hits = [
      makeHit({ route: "/a", userId: "u1" }),
      makeHit({ route: "/b", userId: "u2" }),
      makeHit({ route: "/a", userId: "u2" }),
    ];
    const report = generateUniqueUsersReport(hits);
    expect(report.totalUniqueUsers).toBe(2);
  });

  it("sorts routes by unique users descending", () => {
    const hits = [
      makeHit({ route: "/low", userId: "u1" }),
      makeHit({ route: "/high", userId: "u1" }),
      makeHit({ route: "/high", userId: "u2" }),
      makeHit({ route: "/high", userId: "u3" }),
    ];
    const report = generateUniqueUsersReport(hits);
    expect(report.routes[0].route).toBe("/high");
  });

  it("includes userIds array in route stats", () => {
    const hits = [
      makeHit({ userId: "alice" }),
      makeHit({ userId: "bob" }),
    ];
    const report = generateUniqueUsersReport(hits);
    expect(report.routes[0].userIds).toContain("alice");
    expect(report.routes[0].userIds).toContain("bob");
  });
});

describe("formatUniqueUsersReportText", () => {
  it("includes header and route data", () => {
    const hits = [
      makeHit({ route: "/api/users", method: "GET", userId: "u1" }),
    ];
    const report = generateUniqueUsersReport(hits);
    const text = formatUniqueUsersReportText(report);
    expect(text).toContain("RouteWatch");
    expect(text).toContain("/api/users");
    expect(text).toContain("unique=1");
    expect(text).toContain("requests=1");
  });

  it("includes totals", () => {
    const hits = [makeHit({ userId: "u1" }), makeHit({ userId: "u2" })];
    const report = generateUniqueUsersReport(hits);
    const text = formatUniqueUsersReportText(report);
    expect(text).toContain("Total Unique Users: 2");
    expect(text).toContain("Total Requests: 2");
  });
});
