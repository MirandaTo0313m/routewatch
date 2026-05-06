import { RouteHit } from "./tracker";

export interface PayloadReportEntry {
  route: string;
  method: string;
  hits: number;
  avgRequestBytes: number;
  maxRequestBytes: number;
  avgResponseBytes: number;
  maxResponseBytes: number;
}

export interface PayloadReport {
  generatedAt: string;
  totalHits: number;
  entries: PayloadReportEntry[];
}

export function generatePayloadReport(hits: RouteHit[]): PayloadReport {
  const map = new Map<string, RouteHit[]>();

  for (const hit of hits) {
    if (hit.requestBytes === undefined && hit.responseBytes === undefined) continue;
    const key = `${hit.method}:${hit.route}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(hit);
  }

  const entries: PayloadReportEntry[] = [];

  for (const [key, group] of map.entries()) {
    const [method, route] = key.split(":");
    const reqBytes = group.map((h) => h.requestBytes ?? 0);
    const resBytes = group.map((h) => h.responseBytes ?? 0);
    entries.push({
      route,
      method,
      hits: group.length,
      avgRequestBytes: Math.round(reqBytes.reduce((a, b) => a + b, 0) / group.length),
      maxRequestBytes: Math.max(...reqBytes),
      avgResponseBytes: Math.round(resBytes.reduce((a, b) => a + b, 0) / group.length),
      maxResponseBytes: Math.max(...resBytes),
    });
  }

  entries.sort((a, b) => b.avgResponseBytes - a.avgResponseBytes);

  return {
    generatedAt: new Date().toISOString(),
    totalHits: hits.length,
    entries,
  };
}

export function formatPayloadReportText(report: PayloadReport): string {
  const lines: string[] = [
    `RouteWatch Payload Report — ${report.generatedAt}`,
    `Total hits tracked: ${report.totalHits}`,
    "",
    `${"-".repeat(72)}`,
    `${ "Route".padEnd(30) }${ "Method".padEnd(10) }${ "Hits".padEnd(8) }${ "AvgReq".padEnd(12) }${ "AvgRes" }`,
    `${"-".repeat(72)}`,
  ];

  for (const e of report.entries) {
    lines.push(
      `${e.route.padEnd(30)}${e.method.padEnd(10)}${String(e.hits).padEnd(8)}${String(e.avgRequestBytes + "B").padEnd(12)}${e.avgResponseBytes}B`
    );
  }

  if (report.entries.length === 0) {
    lines.push("No payload data recorded.");
  }

  return lines.join("\n");
}
