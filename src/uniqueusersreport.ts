export interface UniqueUserHit {
  route: string;
  method: string;
  userId: string;
  timestamp: number;
  statusCode: number;
}

export interface UniqueUsersRouteStats {
  route: string;
  method: string;
  uniqueUsers: number;
  totalRequests: number;
  userIds: string[];
}

export interface UniqueUsersReport {
  generatedAt: string;
  totalUniqueUsers: number;
  totalRequests: number;
  routes: UniqueUsersRouteStats[];
}

export function generateUniqueUsersReport(hits: UniqueUserHit[]): UniqueUsersReport {
  const grouped = new Map<string, UniqueUserHit[]>();

  for (const hit of hits) {
    const key = `${hit.method}:${hit.route}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(hit);
  }

  const routes: UniqueUsersRouteStats[] = [];

  for (const [, routeHits] of grouped) {
    const first = routeHits[0];
    const userIds = [...new Set(routeHits.map((h) => h.userId))];
    routes.push({
      route: first.route,
      method: first.method,
      uniqueUsers: userIds.length,
      totalRequests: routeHits.length,
      userIds,
    });
  }

  routes.sort((a, b) => b.uniqueUsers - a.uniqueUsers);

  const allUserIds = new Set(hits.map((h) => h.userId));

  return {
    generatedAt: new Date().toISOString(),
    totalUniqueUsers: allUserIds.size,
    totalRequests: hits.length,
    routes,
  };
}

export function formatUniqueUsersReportText(report: UniqueUsersReport): string {
  const lines: string[] = [
    `RouteWatch — Unique Users Report`,
    `Generated: ${report.generatedAt}`,
    `Total Unique Users: ${report.totalUniqueUsers}`,
    `Total Requests: ${report.totalRequests}`,
    ``,
    `Routes by Unique Users:`,
    `-`.repeat(52),
  ];

  for (const r of report.routes) {
    lines.push(
      `${r.method.padEnd(7)} ${r.route.padEnd(30)} unique=${r.uniqueUsers}  requests=${r.totalRequests}`
    );
  }

  return lines.join("\n");
}
