import { RouteHit } from "./tracker";

export interface DeprecationEntry {
  route: string;
  method: string;
  hits: number;
  lastSeen: number;
  firstSeen: number;
  deprecated: boolean;
  deprecatedSince?: string;
}

export interface DeprecationReport {
  totalDeprecatedHits: number;
  uniqueDeprecatedRoutes: number;
  entries: DeprecationEntry[];
}

export function generateDeprecationReport(
  hits: RouteHit[],
  deprecatedRoutes: Record<string, string> = {}
): DeprecationReport {
  const map = new Map<string, DeprecationEntry>();

  for (const hit of hits) {
    const key = `${hit.method}:${hit.route}`;
    const isDeprecated = key in deprecatedRoutes || hit.route in deprecatedRoutes;
    const deprecatedSince =
      deprecatedRoutes[key] ?? deprecatedRoutes[hit.route];

    if (!map.has(key)) {
      map.set(key, {
        route: hit.route,
        method: hit.method,
        hits: 0,
        lastSeen: hit.timestamp,
        firstSeen: hit.timestamp,
        deprecated: isDeprecated,
        deprecatedSince,
      });
    }

    const entry = map.get(key)!;
    entry.hits += 1;
    if (hit.timestamp > entry.lastSeen) entry.lastSeen = hit.timestamp;
    if (hit.timestamp < entry.firstSeen) entry.firstSeen = hit.timestamp;
  }

  const entries = Array.from(map.values()).sort((a, b) => b.hits - a.hits);
  const deprecated = entries.filter((e) => e.deprecated);

  return {
    totalDeprecatedHits: deprecated.reduce((sum, e) => sum + e.hits, 0),
    uniqueDeprecatedRoutes: deprecated.length,
    entries,
  };
}

export function formatDeprecationReportText(report: DeprecationReport): string {
  const lines: string[] = [
    "=== Deprecation Report ===",
    `Deprecated Routes: ${report.uniqueDeprecatedRoutes}`,
    `Total Hits on Deprecated Routes: ${report.totalDeprecatedHits}`,
    "",
  ];

  const deprecated = report.entries.filter((e) => e.deprecated);
  if (deprecated.length === 0) {
    lines.push("No deprecated routes detected.");
  } else {
    for (const entry of deprecated) {
      const since = entry.deprecatedSince ? ` (since ${entry.deprecatedSince})` : "";
      lines.push(
        `[${entry.method}] ${entry.route}${since} — ${entry.hits} hit(s)`
      );
    }
  }

  return lines.join("\n");
}
