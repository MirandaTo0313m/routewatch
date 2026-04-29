export interface RouteHit {
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: number;
}

export interface RouteStats {
  hits: number;
  totalResponseTimeMs: number;
  avgResponseTimeMs: number;
  statusCodes: Record<number, number>;
  lastHitAt: number;
}

export class RouteTracker {
  private stats: Map<string, RouteStats> = new Map();

  private buildKey(method: string, path: string): string {
    return `${method.toUpperCase()} ${path}`;
  }

  record(hit: RouteHit): void {
    const key = this.buildKey(hit.method, hit.path);
    const existing = this.stats.get(key);

    if (existing) {
      existing.hits += 1;
      existing.totalResponseTimeMs += hit.responseTimeMs;
      existing.avgResponseTimeMs = existing.totalResponseTimeMs / existing.hits;
      existing.statusCodes[hit.statusCode] =
        (existing.statusCodes[hit.statusCode] ?? 0) + 1;
      existing.lastHitAt = hit.timestamp;
    } else {
      this.stats.set(key, {
        hits: 1,
        totalResponseTimeMs: hit.responseTimeMs,
        avgResponseTimeMs: hit.responseTimeMs,
        statusCodes: { [hit.statusCode]: 1 },
        lastHitAt: hit.timestamp,
      });
    }
  }

  getStats(): Record<string, RouteStats> {
    return Object.fromEntries(this.stats.entries());
  }

  getStatsForRoute(method: string, path: string): RouteStats | undefined {
    return this.stats.get(this.buildKey(method, path));
  }

  reset(): void {
    this.stats.clear();
  }
}

export const defaultTracker = new RouteTracker();
