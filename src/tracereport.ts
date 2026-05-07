export interface TraceHit {
  method: string;
  route: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  durationMs: number;
  statusCode: number;
  timestamp: number;
}

export interface TraceRouteStats {
  route: string;
  method: string;
  count: number;
  avgDurationMs: number;
  maxDurationMs: number;
  traceIds: string[];
}

export interface TraceReport {
  generatedAt: string;
  totalTraces: number;
  routes: TraceRouteStats[];
}

export function generateTraceReport(hits: TraceHit[]): TraceReport {
  const grouped = new Map<string, TraceHit[]>();

  for (const hit of hits) {
    const key = `${hit.method}:${hit.route}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(hit);
  }

  const routes: TraceRouteStats[] = [];

  for (const [key, group] of grouped.entries()) {
    const [method, route] = key.split(/:(.+)/);
    const durations = group.map((h) => h.durationMs);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    routes.push({
      route,
      method,
      count: group.length,
      avgDurationMs: Math.round(avg * 100) / 100,
      maxDurationMs: max,
      traceIds: group.map((h) => h.traceId),
    });
  }

  routes.sort((a, b) => b.avgDurationMs - a.avgDurationMs);

  return {
    generatedAt: new Date().toISOString(),
    totalTraces: hits.length,
    routes,
  };
}

export function formatTraceReportText(report: TraceReport): string {
  const lines: string[] = [
    `Trace Report — ${report.generatedAt}`,
    `Total Traces: ${report.totalTraces}`,
    ``,
    `Route                              Method  Count  Avg(ms)  Max(ms)`,
    `-`.repeat(70),
  ];

  for (const r of report.routes) {
    const route = `${r.route}`.padEnd(35);
    const method = r.method.padEnd(7);
    const count = String(r.count).padEnd(6);
    const avg = String(r.avgDurationMs).padEnd(8);
    const max = String(r.maxDurationMs);
    lines.push(`${route}${method}${count}${avg} ${max}`);
  }

  return lines.join(`\n`);
}
