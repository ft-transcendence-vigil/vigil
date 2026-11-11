import type { AlertHistory } from '../../api/alertHistoryApi';
import type { Period, Trace } from '../../api/tracesApi';
import type { Range } from './GeneralFilter';
import type { Point } from './RequestPerformance/RequestPerformance';

export type AlertFilter = 'open' | 'critical' | 'warning';
export type LogFilter = 'issues' | 'all';
export type ServiceState = 'alerting' | 'silent' | 'degraded' | 'healthy';

export interface TimeWindow {
  start: number;
  end: number;
  period?: Period;
  before?: string;
  live: boolean;
  label: string;
}

export interface ServiceSummary {
  name: string;
  state: ServiceState;
  latency: number | null;
  rate: number | null;
}

// badge colors for alert and log severities (error and critical share red)
export const SEVERITY_CLASS: Record<string, string> = {
  critical: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  error: 'border border-red-500/30 bg-red-400/10 text-red-500/80',
  warning: 'border border-yellow-500/30 bg-yellow-400/10 text-yellow-500/80',
  info: 'border border-blue-500/30 bg-blue-400/10 text-blue-500/80',
};
export const OTHER_CLASS = 'border border-vigil-border text-vigil-muted';

export const STATE_COLOR: Record<
  ServiceState,
  { bgColor: string; textColor: string }
> = {
  alerting: { bgColor: 'bg-red-500/80', textColor: 'text-red-500/80' },
  silent: { bgColor: 'bg-blue-500/80', textColor: 'text-blue-500/80' },
  degraded: { bgColor: 'bg-yellow-500/80', textColor: 'text-yellow-500/80' },
  healthy: { bgColor: 'bg-green-500/80', textColor: 'text-green-500/80' },
};

const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
// clickhouse keeps 30 days (TTL), so "all" never goes further back than that
const RETENTION = 30 * DAY;
const DURATION: Record<Period, number> = {
  '1h': HOUR,
  '24h': DAY,
  '7d': 7 * DAY,
  '30d': RETENTION,
};

// turns the range buttons into what the api understands
// the api has no "from" param, so custom asks for the smallest period that reaches its start,
// sends before=end, and the start is filtered here
export function toWindow(
  range: Range,
  from: string,
  to: string,
  now: number,
): TimeWindow {
  if (range === 'custom' && from && to) {
    const end = Math.min(new Date(`${to}T23:59:59.999`).getTime(), now);
    const start = Math.min(new Date(`${from}T00:00:00`).getTime(), end);
    const live = end >= now - 1000;
    const periods = Object.keys(DURATION) as Period[];
    return {
      start,
      end,
      period: periods.find((p) => now - DURATION[p] <= start),
      before: live ? undefined : new Date(end).toISOString(),
      live,
      label: `${from} → ${to}`,
    };
  }
  if (range === 'all' || range === 'custom')
    return { start: now - RETENTION, end: now, live: true, label: 'all time' };
  return {
    start: now - DURATION[range],
    end: now,
    period: range,
    live: true,
    label: `last ${range}`,
  };
}

export function inWindow(window: TimeWindow, iso: string) {
  const t = new Date(iso).getTime();
  return t >= window.start && t <= window.end;
}

export function isOpen(alert: AlertHistory) {
  return alert.status !== 'resolved';
}

// "error_rate ≥ 5% · 60s", or the watchdog text for service_silent
export function describeAlert(alert: AlertHistory) {
  if (alert.metric_name === 'service_silent')
    return 'service_silent · no data received';
  const metric =
    alert.signal_type === 'metrics' && alert.aggregation
      ? `${alert.aggregation}(${alert.metric_name})`
      : alert.metric_name;
  const threshold =
    alert.metric_name === 'error_rate' && alert.threshold !== null
      ? `${+(alert.threshold * 100).toFixed(2)}%`
      : alert.threshold;
  const window = alert.window_seconds ? ` · ${alert.window_seconds}s` : '';
  return `${metric} ≥ ${threshold}${window}`;
}

// open = nobody acknowledged it yet
export function matchesAlertFilter(filter: AlertFilter, alert: AlertHistory) {
  if (filter === 'open') return alert.status === 'sent';
  return alert.severity === filter;
}

// critical first, then newest first
export function sortAlerts(alerts: AlertHistory[]) {
  return [...alerts].sort(
    (a, b) =>
      Number(b.severity === 'critical') - Number(a.severity === 'critical') ||
      new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime(),
  );
}

// the state of a service comes from its open alerts:
// silent if the watchdog fired, alerting if a critical is open, degraded for any other open alert
function serviceState(open: AlertHistory[]): ServiceState {
  if (open.some((a) => a.metric_name === 'service_silent')) return 'silent';
  if (open.some((a) => a.severity === 'critical')) return 'alerting';
  return open.length ? 'degraded' : 'healthy';
}

const STATE_RANK: Record<ServiceState, number> = {
  alerting: 0,
  silent: 1,
  degraded: 2,
  healthy: 3,
};

// every service seen in the spans or the alerts, worst first
// latency = average span duration, rate = spans per minute over the time the spans cover
export function summarizeServices(
  alerts: AlertHistory[],
  spans: Trace[],
  coveredMinutes: number,
): ServiceSummary[] {
  const byService = new Map<string, { total: number; count: number }>();
  for (const span of spans) {
    const entry = byService.get(span.service) ?? { total: 0, count: 0 };
    entry.total += span.duration_ms;
    entry.count++;
    byService.set(span.service, entry);
  }
  const names = new Set([...byService.keys(), ...alerts.map((a) => a.service)]);

  return [...names]
    .map((name) => {
      const stats = byService.get(name);
      return {
        name,
        state: serviceState(
          alerts.filter((a) => a.service === name && isOpen(a)),
        ),
        latency: stats ? stats.total / stats.count : null,
        rate: stats && coveredMinutes > 0 ? stats.count / coveredMinutes : null,
      };
    })
    .sort(
      (a, b) =>
        STATE_RANK[a.state] - STATE_RANK[b.state] ||
        (b.latency ?? 0) - (a.latency ?? 0),
    );
}

// splits [start, end] into equal buckets: spans/min, error spans/min and average latency
// per minute (not per second) so small test setups don't show 0.01, and errors share the throughput axis
export function bucketSpans(
  spans: Trace[],
  start: number,
  end: number,
  buckets = 24,
): Point[] {
  const size = Math.max(1, (end - start) / buckets);
  const points = Array.from({ length: buckets }, (_, i) => ({
    ts: start + (i + 1) * size,
    count: 0,
    errors: 0,
    total: 0,
  }));
  for (const span of spans) {
    const i = Math.floor((new Date(span.timestamp).getTime() - start) / size);
    if (i < 0 || i >= buckets) continue;
    points[i].count++;
    points[i].total += span.duration_ms;
    if (span.status === 'error') points[i].errors++;
  }
  return points.map((p) => ({
    ts: p.ts,
    throughput: p.count / (size / 60_000),
    errors: p.errors / (size / 60_000),
    latency: p.count ? p.total / p.count : null,
  }));
}

// 15:04:05, with the date in front when it isn't today
export function formatLogTime(iso: string) {
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], { hour12: false });
  return Date.now() - date.getTime() > DAY
    ? `${date.getMonth() + 1}/${date.getDate()} ${time}`
    : time;
}

export function formatRate(rate: number | null) {
  if (rate === null) return '—';
  return `${rate >= 10 ? Math.round(rate) : rate.toFixed(rate >= 1 ? 1 : 2)}/min`;
}

// "2026-11-10" in local time, for the date inputs
export function toDateInput(t: number) {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
