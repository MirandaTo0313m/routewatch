import { RouteHit } from './tracker';
import { generateReport } from './reporter';

export interface DashboardOptions {
  title?: string;
  refreshInterval?: number;
}

const defaultOptions: Required<DashboardOptions> = {
  title: 'RouteWatch Dashboard',
  refreshInterval: 5000,
};

export function generateDashboardHTML(
  hits: RouteHit[],
  options: DashboardOptions = {}
): string {
  const opts = { ...defaultOptions, ...options };
  const report = generateReport(hits);

  const rows = report.routes
    .sort((a, b) => b.count - a.count)
    .map((r) => {
      const avgMs = r.avgDurationMs != null ? `${r.avgDurationMs.toFixed(1)} ms` : 'N/A';
      const lastSeen = r.lastSeen ? new Date(r.lastSeen).toLocaleString() : 'N/A';
      return `<tr>
        <td>${r.method}</td>
        <td>${r.path}</td>
        <td>${r.count}</td>
        <td>${avgMs}</td>
        <td>${lastSeen}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="${opts.refreshInterval / 1000}" />
  <title>${opts.title}</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #f9f9f9; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
    th, td { padding: .6rem 1rem; border: 1px solid #ddd; text-align: left; }
    th { background: #4f46e5; color: #fff; }
    tr:nth-child(even) { background: #f3f4f6; }
    .meta { color: #666; font-size: .85rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <h1>${opts.title}</h1>
  <p class="meta">Total hits: <strong>${report.totalHits}</strong> &nbsp;|&nbsp; Unique routes: <strong>${report.uniqueRoutes}</strong> &nbsp;|&nbsp; Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
  <table>
    <thead><tr><th>Method</th><th>Path</th><th>Hits</th><th>Avg Duration</th><th>Last Seen</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
