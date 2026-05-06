import { RouteHit } from "./tracker";

export interface GeoSummary {
  country: string;
  count: number;
  routes: string[];
  avgDuration: number;
}

export interface GeoReport {
  totalHits: number;
  uniqueCountries: number;
  byCountry: GeoSummary[];
  topCountry: string | null;
  generatedAt: string;
}

export function generateGeoReport(hits: RouteHit[]): GeoReport {
  const hitsWithGeo = hits.filter((h) => h.country && h.country.trim() !== "");

  const countryMap = new Map<string, { count: number; routes: Set<string>; totalDuration: number }>();

  for (const hit of hitsWithGeo) {
    const country = hit.country!;
    if (!countryMap.has(country)) {
      countryMap.set(country, { count: 0, routes: new Set(), totalDuration: 0 });
    }
    const entry = countryMap.get(country)!;
    entry.count += 1;
    entry.routes.add(`${hit.method} ${hit.route}`);
    entry.totalDuration += hit.duration ?? 0;
  }

  const byCountry: GeoSummary[] = Array.from(countryMap.entries())
    .map(([country, data]) => ({
      country,
      count: data.count,
      routes: Array.from(data.routes),
      avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const topCountry = byCountry.length > 0 ? byCountry[0].country : null;

  return {
    totalHits: hitsWithGeo.length,
    uniqueCountries: countryMap.size,
    byCountry,
    topCountry,
    generatedAt: new Date().toISOString(),
  };
}

export function formatGeoReportText(report: GeoReport): string {
  const lines: string[] = [
    "=== Geo Report ===",
    `Generated: ${report.generatedAt}`,
    `Total Hits (with geo): ${report.totalHits}`,
    `Unique Countries: ${report.uniqueCountries}`,
    `Top Country: ${report.topCountry ?? "N/A"}`,
    "",
    "By Country:",
  ];

  for (const entry of report.byCountry) {
    lines.push(
      `  ${entry.country}: ${entry.count} hits | avg ${entry.avgDuration}ms | routes: ${entry.routes.length}`
    );
  }

  return lines.join("\n");
}
