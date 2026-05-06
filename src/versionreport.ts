import { RouteHit } from "./tracker";

export interface VersionStats {
  version: string;
  count: number;
  routes: Set<string>;
  errorCount: number;
  avgDuration: number;
}

export interface VersionReport {
  generatedAt: string;
  totalHits: number;
  versions: VersionStats[];
}

function resolveVersion(hit: RouteHit): string {
  const match = hit.path.match(/\/(v\d+)\//);
  return match ? match[1] : "unversioned";
}

export function generateVersionReport(hits: RouteHit[]): VersionReport {
  const map = new Map<string, { count: number; routes: Set<string>; errors: number; durations: number[] }>();

  for (const hit of hits) {
    const version = resolveVersion(hit);
    if (!map.has(version)) {
      map.set(version, { count: 0, routes: new Set(), errors: 0, durations: [] });
    }
    const entry = map.get(version)!;
    entry.count++;
    entry.routes.add(`${hit.method} ${hit.path}`);
    if (hit.statusCode >= 400) entry.errors++;
    if (typeof hit.duration === "number") entry.durations.push(hit.duration);
  }

  const versions: VersionStats[] = Array.from(map.entries()).map(([version, data]) => ({
    version,
    count: data.count,
    routes: data.routes,
    errorCount: data.errors,
    avgDuration:
      data.durations.length > 0
        ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
        : 0,
  }));

  versions.sort((a, b) => b.count - a.count);

  return {
    generatedAt: new Date().toISOString(),
    totalHits: hits.length,
    versions,
  };
}

export function formatVersionReportText(report: VersionReport): string {
  const lines: string[] = [
    `RouteWatch Version Report — ${report.generatedAt}`,
    `Total hits: ${report.totalHits}`,
    "",
  ];

  for (const v of report.versions) {
    lines.push(`[${v.version}]`);
    lines.push(`  Hits        : ${v.count}`);
    lines.push(`  Unique routes: ${v.routes.size}`);
    lines.push(`  Errors      : ${v.errorCount}`);
    lines.push(`  Avg duration: ${v.avgDuration}ms`);
    lines.push("");
  }

  return lines.join("\n");
}
