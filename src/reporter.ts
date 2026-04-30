import { RouteHit } from './tracker';

export interface RouteStats {
  route: string;
  method: string;
  count: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  lastHitAt: Date | null;
}

export interface Report {
  generatedAt: Date;
  totalRequests: number;
  routes: RouteStats[];
}

export function generateReport(hits: RouteHit[]): Report {
  const statsMap = new Map<string, RouteStats>();

  for (const hit of hits) {
    const key = `${hit.method}:${hit.route}`;

    if (!statsMap.has(key)) {
      statsMap.set(key, {
        route: hit.route,
        method: hit.method,
        count: 0,
        avgDurationMs: 0,
        minDurationMs: Infinity,
        maxDurationMs: -Infinity,
        lastHitAt: null,
      });
    }

    const stats = statsMap.get(key)!;
    const duration = hit.durationMs ?? 0;

    stats.count += 1;
    stats.avgDurationMs =
      (stats.avgDurationMs * (stats.count - 1) + duration) / stats.count;
    stats.minDurationMs = Math.min(stats.minDurationMs, duration);
    stats.maxDurationMs = Math.max(stats.maxDurationMs, duration);
    stats.lastHitAt =
      stats.lastHitAt && stats.lastHitAt > hit.timestamp
        ? stats.lastHitAt
        : hit.timestamp;
  }

  const routes = Array.from(statsMap.values()).sort(
    (a, b) => b.count - a.count
  );

  return {
    generatedAt: new Date(),
    totalRequests: hits.length,
    routes,
  };
}

export function formatReportText(report: Report): string {
  const lines: string[] = [
    `RouteWatch Report — ${report.generatedAt.toISOString()}`,
    `Total Requests: ${report.totalRequests}`,
    '',
    `${'Method'.padEnd(8)} ${'Route'.padEnd(40)} ${'Count'.padStart(6)} ${'Avg ms'.padStart(8)} ${'Min ms'.padStart(8)} ${'Max ms'.padStart(8)}`,
    '-'.repeat(84),
  ];

  for (const r of report.routes) {
    lines.push(
      `${r.method.padEnd(8)} ${r.route.padEnd(40)} ${String(r.count).padStart(6)} ${r.avgDurationMs.toFixed(1).padStart(8)} ${r.minDurationMs.toFixed(1).padStart(8)} ${r.maxDurationMs.toFixed(1).padStart(8)}`
    );
  }

  return lines.join('\n');
}

/**
 * Returns the top N routes by request count from a report.
 * Useful for quickly identifying the most frequently hit endpoints.
 */
export function topRoutes(report: Report, n: number): RouteStats[] {
  return report.routes.slice(0, Math.max(0, n));
}
