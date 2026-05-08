export interface BandwidthHit {
  route: string;
  method: string;
  requestBytes: number;
  responseBytes: number;
  timestamp: number;
}

export interface BandwidthRouteStats {
  route: string;
  method: string;
  hits: number;
  totalRequestBytes: number;
  totalResponseBytes: number;
  avgRequestBytes: number;
  avgResponseBytes: number;
  totalBytes: number;
}

export interface BandwidthReport {
  generatedAt: string;
  totalHits: number;
  totalRequestBytes: number;
  totalResponseBytes: number;
  totalBytes: number;
  routes: BandwidthRouteStats[];
}

export function generateBandwidthReport(hits: BandwidthHit[]): BandwidthReport {
  const grouped = new Map<string, BandwidthHit[]>();

  for (const hit of hits) {
    const key = `${hit.method}:${hit.route}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(hit);
  }

  const routes: BandwidthRouteStats[] = [];

  for (const [, group] of grouped) {
    const first = group[0];
    const totalRequestBytes = group.reduce((s, h) => s + h.requestBytes, 0);
    const totalResponseBytes = group.reduce((s, h) => s + h.responseBytes, 0);
    routes.push({
      route: first.route,
      method: first.method,
      hits: group.length,
      totalRequestBytes,
      totalResponseBytes,
      avgRequestBytes: Math.round(totalRequestBytes / group.length),
      avgResponseBytes: Math.round(totalResponseBytes / group.length),
      totalBytes: totalRequestBytes + totalResponseBytes,
    });
  }

  routes.sort((a, b) => b.totalBytes - a.totalBytes);

  const totalRequestBytes = hits.reduce((s, h) => s + h.requestBytes, 0);
  const totalResponseBytes = hits.reduce((s, h) => s + h.responseBytes, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalHits: hits.length,
    totalRequestBytes,
    totalResponseBytes,
    totalBytes: totalRequestBytes + totalResponseBytes,
    routes,
  };
}

export function formatBandwidthReportText(report: BandwidthReport): string {
  const lines: string[] = [
    `Bandwidth Report — ${report.generatedAt}`,
    `Total Hits: ${report.totalHits}`,
    `Total Request Bytes:  ${report.totalRequestBytes}`,
    `Total Response Bytes: ${report.totalResponseBytes}`,
    `Total Bytes: ${report.totalBytes}`,
    ``,
    `Routes (sorted by total bytes):`,
  ];

  for (const r of report.routes) {
    lines.push(
      `  [${r.method}] ${r.route} — hits: ${r.hits}, req: ${r.avgRequestBytes}B avg, res: ${r.avgResponseBytes}B avg, total: ${r.totalBytes}B`
    );
  }

  return lines.join("\n");
}
