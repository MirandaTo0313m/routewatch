import { RouteHit } from './tracker';
import { generateReport } from './reporter';
import * as fs from 'fs';
import * as path from 'path';

export type ExportFormat = 'json' | 'csv' | 'text';

export interface ExportOptions {
  format: ExportFormat;
  outputPath: string;
  pretty?: boolean;
}

export function exportToJSON(hits: RouteHit[], pretty = false): string {
  const report = generateReport(hits);
  return JSON.stringify(report, null, pretty ? 2 : undefined);
}

export function exportToCSV(hits: RouteHit[]): string {
  const report = generateReport(hits);
  const header = 'method,route,count,avgDurationMs,lastHit';
  const rows = report.routes.map((r) =>
    [
      r.method,
      r.route,
      r.count,
      r.avgDurationMs.toFixed(2),
      r.lastHit.toISOString(),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function exportReport(
  hits: RouteHit[],
  options: ExportOptions
): void {
  let content: string;

  switch (options.format) {
    case 'json':
      content = exportToJSON(hits, options.pretty ?? false);
      break;
    case 'csv':
      content = exportToCSV(hits);
      break;
    case 'text': {
      const { formatReportText } = require('./reporter');
      content = formatReportText(generateReport(hits));
      break;
    }
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }

  const dir = path.dirname(options.outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(options.outputPath, content, 'utf-8');
}
