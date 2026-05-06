import { RouteHit } from "./tracker";

export interface RouteDependency {
  route: string;
  method: string;
  calledBy: string[];
  callCount: number;
  avgLatency: number;
  errorRate: number;
}

export interface DependencyReport {
  generatedAt: string;
  totalRoutes: number;
  dependencies: RouteDependency[];
}

export function generateDependencyReport(hits: RouteHit[]): DependencyReport {
  const map = new Map<string, RouteDependency>();

  for (const hit of hits) {
    const key = `${hit.method}:${hit.route}`;
    const referer = (hit as any).referer as string | undefined;
    const latency = (hit as any).latency as number | undefined;
    const isError = hit.statusCode >= 400;

    if (!map.has(key)) {
      map.set(key, {
        route: hit.route,
        method: hit.method,
        calledBy: [],
        callCount: 0,
        avgLatency: 0,
        errorRate: 0,
      });
    }

    const entry = map.get(key)!;
    entry.callCount += 1;

    if (referer && !entry.calledBy.includes(referer)) {
      entry.calledBy.push(referer);
    }

    if (latency !== undefined) {
      entry.avgLatency =
        (entry.avgLatency * (entry.callCount - 1) + latency) / entry.callCount;
    }

    if (isError) {
      const prevErrors = entry.errorRate * (entry.callCount - 1);
      entry.errorRate = (prevErrors + 1) / entry.callCount;
    }
  }

  const dependencies = Array.from(map.values()).sort(
    (a, b) => b.callCount - a.callCount
  );

  return {
    generatedAt: new Date().toISOString(),
    totalRoutes: dependencies.length,
    dependencies,
  };
}

export function formatDependencyReportText(report: DependencyReport): string {
  const lines: string[] = [
    `RouteWatch Dependency Report — ${report.generatedAt}`,
    `Total Routes: ${report.totalRoutes}`,
    "",
  ];

  for (const dep of report.dependencies) {
    lines.push(`[${dep.method}] ${dep.route}`);
    lines.push(`  Calls      : ${dep.callCount}`);
    lines.push(`  Avg Latency: ${dep.avgLatency.toFixed(1)}ms`);
    lines.push(`  Error Rate : ${(dep.errorRate * 100).toFixed(1)}%`);
    lines.push(
      `  Called By  : ${
        dep.calledBy.length > 0 ? dep.calledBy.join(", ") : "(direct)"
      }`
    );
    lines.push("");
  }

  return lines.join("\n");
}
