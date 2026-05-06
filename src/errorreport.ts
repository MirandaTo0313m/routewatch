import { RouteHit } from "./tracker";

export interface ErrorSummary {
  route: string;
  method: string;
  totalHits: number;
  errorHits: number;
  errorRate: number;
  statusCodes: Record<number, number>;
}

export interface ErrorReport {
  generatedAt: string;
  totalRequests: number;
  totalErrors: number;
  overallErrorRate: number;
  routes: ErrorSummary[];
}

export function generateErrorReport(hits: RouteHit[]): ErrorReport {
  const groups: Record<string, RouteHit[]> = {};

  for (const hit of hits) {
    const key = `${hit.method}:${hit.route}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(hit);
  }

  const routes: ErrorSummary[] = Object.entries(groups).map(([key, routeHits]) => {
    const [method, route] = key.split(":");
    const errorHits = routeHits.filter((h) => h.statusCode >= 400);
    const statusCodes: Record<number, number> = {};
    for (const h of routeHits) {
      statusCodes[h.statusCode] = (statusCodes[h.statusCode] || 0) + 1;
    }
    return {
      route,
      method,
      totalHits: routeHits.length,
      errorHits: errorHits.length,
      errorRate: routeHits.length > 0 ? errorHits.length / routeHits.length : 0,
      statusCodes,
    };
  });

  routes.sort((a, b) => b.errorRate - a.errorRate);

  const totalRequests = hits.length;
  const totalErrors = hits.filter((h) => h.statusCode >= 400).length;

  return {
    generatedAt: new Date().toISOString(),
    totalRequests,
    totalErrors,
    overallErrorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
    routes,
  };
}

export function formatErrorReportText(report: ErrorReport): string {
  const lines: string[] = [
    `RouteWatch Error Report — ${report.generatedAt}`,
    `Total Requests : ${report.totalRequests}`,
    `Total Errors   : ${report.totalErrors}`,
    `Overall Error Rate: ${(report.overallErrorRate * 100).toFixed(1)}%`,
    "",
    "Route Breakdown:",
  ];

  for (const r of report.routes) {
    const codes = Object.entries(r.statusCodes)
      .map(([code, count]) => `${code}×${count}`)
      .join(", ");
    lines.push(
      `  ${r.method} ${r.route} — errors: ${r.errorHits}/${r.totalHits} (${(r.errorRate * 100).toFixed(1)}%) [${codes}]`
    );
  }

  return lines.join("\n");
}
