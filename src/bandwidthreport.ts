import { RouteHit } from "./tracker";

export interface BandwidthEntry {
  route: string;
  method: string;
  totalRequestBytes: number;
  totalResponseBytes: number;
  hitCount: number;
  avgRequestBytes: number;
  avgResponseBytes: number;
}

export interface BandwidthReport {
  generatedAt: string;
  totalRequestBytes: number;
  totalResponseBytes: number;
  entries: BandwidthEntry[];
}

export function generateBandwidthReport(hits: RouteHit[]): BandwidthReport {
  const map = new Map<string, BandwidthEntry>();

  for (const hit of hits) {
    const key = `${hit.method}:${hit.route}`;
    if (!map.has(key)) {
      map.set(key, {
        route: hit.route,
        method: hit.method,
        totalRequestBytes: 0,
        totalResponseBytes: 0,
        hitCount: 0,
        avgRequestBytes: 0,
        avgResponseBytes: 0,
      });
    }
    const entry = map.get(key)!;
    entry.totalRequestBytes += hit.requestBytes ?? 0;
    entry.totalResponseBytes += hit.responseBytes ?? 0;
    entry.hitCount += 1;
  }

  const entries = Array.from(map.values()).map((e) => ({
    ...e,
    avgRequestBytes: e.hitCount > 0 ? Math.round(e.totalRequestBytes / e.hitCount) : 0,
    avgResponseBytes: e.hitCount > 0 ? Math.round(e.totalResponseBytes / e.hitCount) : 0,
  }));

  entries.sort((a, b) => b.totalResponseBytes - a.totalResponseBytes);

  const totalRequestBytes = entries.reduce((s, e) => s + e.totalRequestBytes, 0);
  const totalResponseBytes = entries.reduce((s, e) => s + e.totalResponseBytes, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalRequestBytes,
    totalResponseBytes,
    entries,
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(2)} KB`;
  return `${bytes} B`;
}

export function formatBandwidthReportText(report: BandwidthReport): string {
  const lines: string[] = [
    `Bandwidth Report — ${report.generatedAt}`,
    `Total Request Traffic : ${formatBytes(report.totalRequestBytes)}`,
    `Total Response Traffic: ${formatBytes(report.totalResponseBytes)}`,
    "",
    `${"-".repeat(72)}`,
    `${ "Method".padEnd(8) }${ "Route".padEnd(32) }${ "Hits".padEnd(8) }${ "Req Avg".padEnd(12) }Res Avg`,
    `${"-".repeat(72)}`,
  ];

  for (const e of report.entries) {
    lines.push(
      `${e.method.padEnd(8)}${e.route.padEnd(32)}${String(e.hitCount).padEnd(8)}${formatBytes(e.avgRequestBytes).padEnd(12)}${formatBytes(e.avgResponseBytes)}`
    );
  }

  return lines.join("\n");
}
