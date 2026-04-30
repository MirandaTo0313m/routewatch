import { RouteHit } from './tracker';

export interface AlertRule {
  route?: string;
  method?: string;
  threshold: number;
  windowMs: number;
  type: 'count' | 'errorRate' | 'latency';
}

export interface AlertEvent {
  rule: AlertRule;
  route: string;
  method: string;
  value: number;
  triggeredAt: Date;
}

export function evaluateAlerts(
  hits: RouteHit[],
  rules: AlertRule[],
  now: Date = new Date()
): AlertEvent[] {
  const events: AlertEvent[] = [];

  for (const rule of rules) {
    const windowStart = new Date(now.getTime() - rule.windowMs);

    const relevant = hits.filter((h) => {
      const matchesRoute = !rule.route || h.route === rule.route;
      const matchesMethod = !rule.method || h.method === rule.method;
      const inWindow = new Date(h.timestamp) >= windowStart;
      return matchesRoute && matchesMethod && inWindow;
    });

    const grouped = groupByRouteMethod(relevant);

    for (const [key, group] of Object.entries(grouped)) {
      const [method, route] = key.split('|');
      let value = 0;

      if (rule.type === 'count') {
        value = group.length;
      } else if (rule.type === 'errorRate') {
        const errors = group.filter((h) => h.statusCode >= 500).length;
        value = group.length > 0 ? (errors / group.length) * 100 : 0;
      } else if (rule.type === 'latency') {
        const durations = group.map((h) => h.durationMs ?? 0);
        value = durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;
      }

      if (value >= rule.threshold) {
        events.push({ rule, route, method, value, triggeredAt: now });
      }
    }
  }

  return events;
}

function groupByRouteMethod(
  hits: RouteHit[]
): Record<string, RouteHit[]> {
  const groups: Record<string, RouteHit[]> = {};
  for (const hit of hits) {
    const key = `${hit.method}|${hit.route}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(hit);
  }
  return groups;
}

export function formatAlertMessage(event: AlertEvent): string {
  const { method, route, value, rule } = event;
  return `[ALERT] ${method} ${route} — ${rule.type}=${value.toFixed(2)} exceeded threshold=${rule.threshold} (window=${rule.windowMs}ms)`;
}
