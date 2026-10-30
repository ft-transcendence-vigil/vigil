import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/authContext';
import { getTraces, type Trace } from '../api/tracesApi';
import { getMetrics, type Metric } from '../api/metricsApi';
import { getAlerts } from '../api/alertsApi';

export type Health = 'operational' | 'degraded' | 'down';

export interface ServiceHealth {
  name: string;
  health: Health;
  p95: number;
  errorRate: number;
  spansPerMin: number;
  lastSeen: string;
}

// The API allows 10 requests per minute per client, and this page makes 3 per refresh.
const REFRESH_MS = 60_000;
const SAMPLE_SIZE = 500;

export const THRESHOLDS = {
  degraded: { errorRate: 2, p95: 800 },
  down: { errorRate: 5, p95: 1200 },
};

const pollingOptions = {
  refetchInterval: REFRESH_MS,
  refetchOnWindowFocus: false,
  retry: false,
} as const;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

function healthOf(p95: number, errorRate: number): Health {
  if (errorRate > THRESHOLDS.down.errorRate || p95 > THRESHOLDS.down.p95)
    return 'down';
  if (
    errorRate > THRESHOLDS.degraded.errorRate ||
    p95 > THRESHOLDS.degraded.p95
  )
    return 'degraded';
  return 'operational';
}

function summarizeServices(traces: Trace[]): ServiceHealth[] {
  if (traces.length === 0) return [];

  const oldest = Math.min(...traces.map((t) => Date.parse(t.timestamp)));
  const newest = Math.max(...traces.map((t) => Date.parse(t.timestamp)));
  const minutes = Math.max(1, (newest - oldest) / 60_000);

  const byService = new Map<string, Trace[]>();
  for (const trace of traces) {
    const spans = byService.get(trace.service);
    if (spans) spans.push(trace);
    else byService.set(trace.service, [trace]);
  }

  return [...byService.entries()]
    .map(([name, spans]) => {
      const durations = spans.map((s) => s.duration_ms).sort((a, b) => a - b);
      const errors = spans.filter((s) => s.status === 'error').length;
      const p95 = percentile(durations, 0.95);
      const errorRate = (errors / spans.length) * 100;
      return {
        name,
        health: healthOf(p95, errorRate),
        p95,
        errorRate,
        spansPerMin: spans.length / minutes,
        lastSeen: spans[0].timestamp,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function latestPerMetric(metrics: Metric[]): Metric[] {
  const latest = new Map<string, Metric>();
  for (const metric of metrics) {
    const key = `${metric.service}/${metric.name}`;
    if (!latest.has(key)) latest.set(key, metric);
  }
  return [...latest.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function useStatus() {
  const { apiFetch } = useAuth();

  const tracesQuery = useQuery({
    queryKey: ['status', 'traces'],
    queryFn: () => getTraces(apiFetch, { period: '1h', count: SAMPLE_SIZE }),
    ...pollingOptions,
  });

  const infraQuery = useQuery({
    queryKey: ['status', 'infra'],
    queryFn: () =>
      getMetrics(apiFetch, {
        period: '1h',
        internalOnly: true,
        count: SAMPLE_SIZE,
      }),
    ...pollingOptions,
  });

  const alertsQuery = useQuery({
    queryKey: ['status', 'alerts'],
    queryFn: () => getAlerts(apiFetch, { period: '24h', count: 10 }),
    ...pollingOptions,
  });

  const services = useMemo(
    () => summarizeServices(tracesQuery.data?.data ?? []),
    [tracesQuery.data],
  );

  const infra = useMemo(
    () => latestPerMetric(infraQuery.data?.data ?? []),
    [infraQuery.data],
  );

  const isRefreshing =
    tracesQuery.isFetching || infraQuery.isFetching || alertsQuery.isFetching;

  function refresh() {
    if (isRefreshing) return;
    tracesQuery.refetch();
    infraQuery.refetch();
    alertsQuery.refetch();
  }

  return {
    services,
    servicesLoading: tracesQuery.isLoading,
    servicesError: tracesQuery.error,
    infra,
    infraLoading: infraQuery.isLoading,
    infraError: infraQuery.error,
    alerts: alertsQuery.data?.data ?? [],
    alertsLoading: alertsQuery.isLoading,
    alertsError: alertsQuery.error,
    updatedAt: tracesQuery.dataUpdatedAt,
    isRefreshing,
    refresh,
  };
}
