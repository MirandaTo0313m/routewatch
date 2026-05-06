import { RouteHit } from "./tracker";

export interface TimeoutReportEntry {
  route: string;
  method: string;
  totalRequests: number;
  timeouts: number;
  timeoutRate: number;
  avgDurationMs: number;
}

export interface TimeoutReport {
  generatedAt: string;
  totalRequests: number;
  totalTimeouts: number;
  entries: TimeoutReportEntry[];
}

export function generateTimeoutReport(hits: RouteHit[]): TimeoutReport {
  const map = new Map<string, { total: number; timeouts: number; durationSum: number }>();

  for (const hit of hits) {
    const key = `${hit.method}:${hit.route}`;
    const existing = map.get(key) ?? { total: 0, timeouts: 0, durationSum: 0 };
    existing.total += 1;
    existing.durationSum += hit.durationMs;
    if (hit.meta?.timeout === true || hit.statusCode === 408) {
      existing.timeouts += 1;
    }
    map.set(key, existing);
  }

  const entries: TimeoutReportEntry[] = Array.from(map.entries()).map(([key, data]) => {
    const [method, ...routeParts] = key.split(":");
    return {
      route: routeParts.join(":"),
      method,
      totalRequests: data.total,
      timeouts: data.timeouts,
      timeoutRate: data.total > 0 ? data.timeouts / data.total : 0,
      avgDurationMs: data.total > 0 ? Math.round(data.durationSum / data.total) : 0,
    };
  });

  entries.sort((a, b) => b.timeoutRate - a.timeoutRate);

  const totalTimeouts = entries.reduce((sum, e) => sum + e.timeouts, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalRequests: hits.length,
    totalTimeouts,
    entries,
  };
}

export function formatTimeoutReportText(report: TimeoutReport): string {
  const lines: string[] = [
    `RouteWatch Timeout Report — ${report.generatedAt}`,
    `Total Requests : ${report.totalRequests}`,
    `Total Timeouts : ${report.totalTimeouts}`,
    "",
    `${ "Route".padEnd(35) }${ "Method".padEnd(10) }${ "Requests".padEnd(12) }${ "Timeouts".padEnd(12) }${ "Rate".padEnd(10) }Avg ms`,
    "-".repeat(85),
  ];

  for (const e of report.entries) {
    const rate = (e.timeoutRate * 100).toFixed(1) + "%";
    lines.push(
      `${e.route.padEnd(35)}${e.method.padEnd(10)}${String(e.totalRequests).padEnd(12)}${String(e.timeouts).padEnd(12)}${rate.padEnd(10)}${e.avgDurationMs}`
    );
  }

  return lines.join("\n");
}
