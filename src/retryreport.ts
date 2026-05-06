import { RouteHit } from "./tracker";

export interface RetryStats {
  route: string;
  method: string;
  totalHits: number;
  retryHits: number;
  retryRate: number;
}

export interface RetryReport {
  generatedAt: string;
  totalHits: number;
  totalRetries: number;
  overallRetryRate: number;
  routes: RetryStats[];
}

export function generateRetryReport(hits: RouteHit[]): RetryReport {
  const grouped: Record<string, { total: number; retries: number }> = {};

  for (const hit of hits) {
    const key = `${hit.method}:${hit.route}`;
    if (!grouped[key]) {
      grouped[key] = { total: 0, retries: 0 };
    }
    grouped[key].total++;
    if (hit.retryCount && hit.retryCount > 0) {
      grouped[key].retries++;
    }
  }

  const routes: RetryStats[] = Object.entries(grouped).map(([key, stats]) => {
    const [method, route] = key.split(":");
    return {
      route,
      method,
      totalHits: stats.total,
      retryHits: stats.retries,
      retryRate: stats.total > 0 ? stats.retries / stats.total : 0,
    };
  });

  routes.sort((a, b) => b.retryRate - a.retryRate);

  const totalHits = hits.length;
  const totalRetries = hits.filter((h) => h.retryCount && h.retryCount > 0).length;

  return {
    generatedAt: new Date().toISOString(),
    totalHits,
    totalRetries,
    overallRetryRate: totalHits > 0 ? totalRetries / totalHits : 0,
    routes,
  };
}

export function formatRetryReportText(report: RetryReport): string {
  const lines: string[] = [
    `RouteWatch Retry Report — ${report.generatedAt}`,
    `Total Hits: ${report.totalHits} | Total Retries: ${report.totalRetries} | Overall Retry Rate: ${(report.overallRetryRate * 100).toFixed(1)}%`,
    "",
    "Route Breakdown:",
  ];

  for (const r of report.routes) {
    lines.push(
      `  [${r.method}] ${r.route} — ${r.retryHits}/${r.totalHits} retries (${(r.retryRate * 100).toFixed(1)}%)`
    );
  }

  return lines.join("\n");
}
