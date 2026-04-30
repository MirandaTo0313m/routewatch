import { exportToJSON, exportToCSV, exportReport, ExportOptions } from './exporter';
import { RouteHit } from './tracker';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

function makeHit(
  route: string,
  method = 'GET',
  durationMs = 100,
  timestamp = new Date('2024-01-01T00:00:00Z')
): RouteHit {
  return { route, method, durationMs, timestamp };
}

describe('exportToJSON', () => {
  it('returns valid JSON string', () => {
    const hits = [makeHit('/api/users'), makeHit('/api/users')];
    const result = exportToJSON(hits);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes route data in output', () => {
    const hits = [makeHit('/api/users', 'POST', 200)];
    const parsed = JSON.parse(exportToJSON(hits, true));
    expect(parsed.routes).toHaveLength(1);
    expect(parsed.routes[0].route).toBe('/api/users');
    expect(parsed.routes[0].method).toBe('POST');
  });

  it('pretty prints when flag is true', () => {
    const hits = [makeHit('/health')];
    const pretty = exportToJSON(hits, true);
    const compact = exportToJSON(hits, false);
    expect(pretty.length).toBeGreaterThan(compact.length);
  });
});

describe('exportToCSV', () => {
  it('includes CSV header row', () => {
    const result = exportToCSV([makeHit('/api/items')]);
    expect(result.startsWith('method,route,count')).toBe(true);
  });

  it('includes one data row per unique route+method', () => {
    const hits = [
      makeHit('/a', 'GET'),
      makeHit('/a', 'GET'),
      makeHit('/b', 'POST'),
    ];
    const lines = exportToCSV(hits).split('\n');
    expect(lines).toHaveLength(3); // header + 2 routes
  });

  it('formats avg duration to 2 decimal places', () => {
    const hits = [makeHit('/api', 'GET', 123)];
    const csv = exportToCSV(hits);
    expect(csv).toContain('123.00');
  });
});

describe('exportReport', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routewatch-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes JSON file to disk', () => {
    const outPath = path.join(tmpDir, 'report.json');
    exportReport([makeHit('/api')], { format: 'json', outputPath: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
    const content = fs.readFileSync(outPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('writes CSV file to disk', () => {
    const outPath = path.join(tmpDir, 'report.csv');
    exportReport([makeHit('/api')], { format: 'csv', outputPath: outPath });
    const content = fs.readFileSync(outPath, 'utf-8');
    expect(content).toContain('method,route');
  });

  it('creates nested directories if needed', () => {
    const outPath = path.join(tmpDir, 'nested', 'dir', 'report.json');
    exportReport([makeHit('/x')], { format: 'json', outputPath: outPath });
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it('throws for unsupported format', () => {
    const opts = { format: 'xml' as any, outputPath: path.join(tmpDir, 'r.xml') };
    expect(() => exportReport([makeHit('/x')], opts)).toThrow('Unsupported export format');
  });
});
