import { StatusCodeHit } from "./middleware/express.statuscode";

export interface StatusCodeBucket {
  range: string;
  count: number;
  routes: Record<string, number>;
}

export interface StatusCodeReport {
  total: number;
  buckets: StatusCodeBucket[];
  topErrorRoutes: { route: string; method: string; count: number }[];
}

function getBucketLabel(code: number): string {
  if (code < 200) return "1xx";
  if (code < 300) return "2xx";
  if (code < 400) return "3xx";
  if (code < 500) return "4xx";
  return "5xx";
}

export function generateStatusCodeReport(hits: StatusCodeHit[]): StatusCodeReport {
  const bucketMap: Record<string, StatusCodeBucket> = {};
  const errorRouteCounts: Record<string, number> = {};

  for (const hit of hits) {
    const label = getBucketLabel(hit.statusCode);
    if (!bucketMap[label]) {
      bucketMap[label] = { range: label, count: 0, routes: {} };
    }
    bucketMap[label].count++;
    const routeKey = `${hit.method} ${hit.route}`;
    bucketMap[label].routes[routeKey] = (bucketMap[label].routes[routeKey] ?? 0) + 1;

    if (hit.statusCode >= 400) {
      errorRouteCounts[routeKey] = (errorRouteCounts[routeKey] ?? 0) + 1;
    }
  }

  const topErrorRoutes = Object.entries(errorRouteCounts)
    .map(([key, count]) => {
      const [method, ...rest] = key.split(" ");
      return { route: rest.join(" "), method, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: hits.length,
    buckets: Object.values(bucketMap).sort((a, b) => a.range.localeCompare(b.range)),
    topErrorRoutes,
  };
}

export function formatStatusCodeReportText(report: StatusCodeReport): string {
  const lines: string[] = ["=== Status Code Report ===", `Total requests: ${report.total}`, ""];

  lines.push("By status class:");
  for (const bucket of report.buckets) {
    lines.push(`  ${bucket.range}: ${bucket.count}`);
  }

  if (report.topErrorRoutes.length > 0) {
    lines.push("", "Top error routes:");
    for (const entry of report.topErrorRoutes) {
      lines.push(`  ${entry.method} ${entry.route} — ${entry.count} errors`);
    }
  }

  return lines.join("\n");
}
