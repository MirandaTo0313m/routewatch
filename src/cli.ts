#!/usr/bin/env node
/**
 * routewatch CLI — export route usage reports from a JSON hits file.
 *
 * Usage:
 *   routewatch export --input hits.json --format csv --output report.csv
 */
import * as fs from 'fs';
import { RouteHit } from './tracker';
import { exportReport, ExportFormat } from './exporter';

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] ?? 'true';
      i++;
    }
  }
  return args;
}

function loadHits(inputPath: string): RouteHit[] {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  const raw = fs.readFileSync(inputPath, 'utf-8');
  const parsed = JSON.parse(raw);
  const hits: RouteHit[] = (Array.isArray(parsed) ? parsed : parsed.routes ?? []).map(
    (h: any) => ({
      route: h.route,
      method: h.method ?? 'GET',
      durationMs: h.durationMs ?? 0,
      timestamp: new Date(h.timestamp ?? Date.now()),
    })
  );
  return hits;
}

function printUsage(): void {
  console.log([
    'Usage: routewatch export --input <file> --format <json|csv|text> --output <file>',
    '',
    'Options:',
    '  --input   Path to JSON file containing route hits',
    '  --format  Output format: json, csv, or text (default: json)',
    '  --output  Destination file path',
    '  --pretty  Pretty-print JSON output (flag)',
  ].join('\n'));
}

function main(): void {
  const [, , command, ...rest] = process.argv;

  if (command !== 'export') {
    printUsage();
    process.exit(0);
  }

  const args = parseArgs(rest);

  if (!args.input || !args.output) {
    console.error('Error: --input and --output are required.');
    printUsage();
    process.exit(1);
  }

  const format = (args.format ?? 'json') as ExportFormat;
  const pretty = args.pretty === 'true';

  try {
    const hits = loadHits(args.input);
    exportReport(hits, { format, outputPath: args.output, pretty });
    console.log(`✔ Report written to ${args.output} (${format})`);
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
