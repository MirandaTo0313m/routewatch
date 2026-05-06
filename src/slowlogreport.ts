import { RouteHit } from "./tracker";

export interface SlowHitSummary {
  route: string;
  method: string;
  count: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  p95Duration: number;
}

export interface SlowLogReport {
  generatedAt: string;
  thresholdMs: number;
  totalSlowHits: number;
  uniqueRoutes: number;
  routes: SlowHitSummary[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function generateSlowLogReport(
  hits: RouteHit[],
  thresholdMs = 500
): SlowLogReport {
  const slow = hits.filter((h) => (h.duration ?? 0) >= thresholdMs);

  const grouped = new Map<string, number[]>();
  for (const hit of slow) {
    const key = `${hit.method}:${hit.route}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(hit.duration ?? 0);
  }

  const routes: SlowHitSummary[] = [];
  for (const [key, durations] of grouped) {
    const [method, route] = key.split(":");
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    routes.push({
      route,
      method,
      count: sorted.length,
      avgDuration: Math.round(sum / sorted.length),
      maxDuration: sorted[sorted.length - 1],
      minDuration: sorted[0],
      p95Duration: percentile(sorted, 95),
    });
  }

  routes.sort((a, b) => b.avgDuration - a.avgDuration);

  return {
    generatedAt: new Date().toISOString(),
    thresholdMs,
    totalSlowHits: slow.length,
    uniqueRoutes: routes.length,
    routes,
  };
}

export function formatSlowLogReportText(report: SlowLogReport): string {
  const lines: string[] = [
    `=== Slow Log Report ===`,
    `Generated: ${report.generatedAt}`,
    `Threshold: ${report.thresholdMs}ms`,
    `Total slow hits: ${report.totalSlowHits} across ${report.uniqueRoutes} route(s)`,
    "",
  ];

  if (report.routes.length === 0) {
    lines.push("No slow routes detected.");
    return lines.join("\n");
  }

  for (const r of report.routes) {
    lines.push(
      `${r.method} ${r.route} — hits: ${r.count}, avg: ${r.avgDuration}ms, ` +
        `min: ${r.minDuration}ms, max: ${r.maxDuration}ms, p95: ${r.p95Duration}ms`
    );
  }

  return lines.join("\n");
}
