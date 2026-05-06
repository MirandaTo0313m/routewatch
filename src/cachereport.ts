import { CacheHitInfo } from "./middleware/express.cache";

export interface CacheReport {
  total: number;
  hits: number;
  misses: number;
  bypasses: number;
  unknown: number;
  hitRate: number;
  topCachedRoutes: { route: string; method: string; count: number }[];
}

export function generateCacheReport(hits: CacheHitInfo[]): CacheReport {
  const total = hits.length;
  const hitCount = hits.filter((h) => h.cacheStatus === "HIT").length;
  const missCount = hits.filter((h) => h.cacheStatus === "MISS").length;
  const bypassCount = hits.filter((h) => h.cacheStatus === "BYPASS").length;
  const unknownCount = hits.filter((h) => h.cacheStatus === "UNKNOWN").length;
  const hitRate = total > 0 ? hitCount / total : 0;

  const routeMap = new Map<string, number>();
  for (const h of hits) {
    if (h.cacheStatus === "HIT") {
      const key = `${h.method}:${h.route}`;
      routeMap.set(key, (routeMap.get(key) ?? 0) + 1);
    }
  }

  const topCachedRoutes = Array.from(routeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => {
      const [method, ...rest] = key.split(":");
      return { route: rest.join(":"), method, count };
    });

  return { total, hits: hitCount, misses: missCount, bypasses: bypassCount, unknown: unknownCount, hitRate, topCachedRoutes };
}

export function formatCacheReportText(report: CacheReport): string {
  const pct = (report.hitRate * 100).toFixed(1);
  const lines: string[] = [
    "=== Cache Report ===",
    `Total tracked: ${report.total}`,
    `Cache HITs:    ${report.hits} (${pct}%)`,
    `Cache MISSes:  ${report.misses}`,
    `Bypasses:      ${report.bypasses}`,
    `Unknown:       ${report.unknown}`,
  ];

  if (report.topCachedRoutes.length > 0) {
    lines.push("", "Top cached routes:");
    for (const r of report.topCachedRoutes) {
      lines.push(`  ${r.method} ${r.route} — ${r.count} hits`);
    }
  }

  return lines.join("\n");
}
