import { RouteHit } from "./tracker";

export interface AuthStats {
  route: string;
  method: string;
  totalHits: number;
  authenticatedHits: number;
  unauthenticatedHits: number;
  authRate: number;
}

/**
 * Aggregates authentication statistics from tracked route hits.
 * Only considers hits that contain authentication metadata.
 */
export function generateAuthReport(hits: RouteHit[]): AuthStats[] {
  const authHits = hits.filter((h) => h.meta?.authenticated !== undefined);

  const grouped = new Map<string, RouteHit[]>();
  for (const hit of authHits) {
    const key = `${hit.method}:${hit.path}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(hit);
  }

  const stats: AuthStats[] = [];
  for (const [key, group] of grouped.entries()) {
    const [method, path] = key.split(":");
    const totalHits = group.length;
    const authenticatedHits = group.filter((h) => h.meta?.authenticated).length;
    const unauthenticatedHits = totalHits - authenticatedHits;
    const authRate = totalHits > 0 ? authenticatedHits / totalHits : 0;

    stats.push({
      route: path,
      method,
      totalHits,
      authenticatedHits,
      unauthenticatedHits,
      authRate: Math.round(authRate * 100) / 100,
    });
  }

  return stats.sort((a, b) => b.totalHits - a.totalHits);
}

/**
 * Formats an auth report as human-readable text.
 */
export function formatAuthReportText(stats: AuthStats[]): string {
  if (stats.length === 0) return "No authenticated route data available.\n";

  const lines: string[] = ["Auth Report", "===========", ""];
  for (const s of stats) {
    const pct = (s.authRate * 100).toFixed(0);
    lines.push(
      `${s.method} ${s.route} — ${s.totalHits} hits | auth: ${s.authenticatedHits} (${pct}%) | unauth: ${s.unauthenticatedHits}`
    );
  }
  lines.push("");
  return lines.join("\n");
}
