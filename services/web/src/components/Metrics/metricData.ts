import type {
  Metric,
  MetricKind,
  MetricSeries,
  Period,
} from '../../api/metricsApi';
import { formatDuration } from '../shared/utils/format';

export interface MetricGroup {
  name: string;
  unit: string;
  kind: MetricKind;
  internal: boolean;
  series: MetricSeries[];
}

export type ChartRow = Record<string, number | null>;

const SERVICE_COLORS = [
  '#2196F3',
  '#00d68f',
  '#f59e0b',
  '#a855f7',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#6b7da8',
];

export function groupByName(series: MetricSeries[]): MetricGroup[] {
  const groups = new Map<string, MetricGroup>();
  for (const s of series) {
    const group = groups.get(s.name);
    if (group) group.series.push(s);
    else
      groups.set(s.name, {
        name: s.name,
        unit: s.unit,
        kind: s.kind,
        internal: s.internal,
        series: [s],
      });
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(a.internal) - Number(b.internal) || a.name.localeCompare(b.name),
  );
}

export function serviceColor(services: string[], service: string): string {
  const index = services.indexOf(service);
  return SERVICE_COLORS[Math.max(0, index) % SERVICE_COLORS.length];
}

// One row per bucket with a column per service, the shape recharts expects.
export function chartRows(group: MetricGroup): ChartRow[] {
  const rows = new Map<number, ChartRow>();
  for (const s of group.series) {
    for (const point of s.points) {
      const time = Date.parse(point.bucket);
      const row = rows.get(time) ?? { time };
      row[s.service] = point.value;
      rows.set(time, row);
    }
  }
  return [...rows.values()].sort((a, b) => Number(a.time) - Number(b.time));
}

function cleanUnit(unit: string): string {
  return unit === '1' ? '' : unit.replace(/[{}]/g, '');
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;
  while (Math.abs(value) >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function formatMetricValue(
  value: number,
  unit: string,
  kind: MetricKind = 'gauge',
): string {
  if (kind === 'counter') {
    const rateUnit = unit === '{request}' ? 'req' : cleanUnit(unit);
    return `${formatNumber(value)} ${rateUnit ? `${rateUnit}/s` : '/s'}`;
  }
  switch (unit) {
    case 'By':
      return formatBytes(value);
    case '%':
      return `${value.toFixed(1)}%`;
    case 'ms':
      return formatDuration(value);
    case 's':
      return formatDuration(value * 1000);
    default:
      return `${formatNumber(value)} ${cleanUnit(unit)}`.trim();
  }
}

export function formatAxisValue(value: number, unit: string): string {
  if (unit === 'By') return formatBytes(value);
  return value.toLocaleString(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}

export function formatBucket(time: number, period: Period): string {
  const date = new Date(time);
  return period === '1h' || period === '24h'
    ? date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function metricKey(metric: Metric): string {
  return `${metric.timestamp}|${metric.service}|${metric.name}|${JSON.stringify(metric.attributes)}`;
}

export function isInternal(metric: Metric): boolean {
  return metric.attributes.internal === 'true';
}
