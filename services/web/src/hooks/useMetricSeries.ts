import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/authContext';
import { getMetricSeries, type Period } from '../api/metricsApi';
import { groupByName } from '../components/Metrics/metricData';

interface Params {
  period: Period;
  service: string;
  live: boolean;
}

const LIVE_REFRESH_MS = 60_000;

export default function useMetricSeries({ period, service, live }: Params) {
  const { apiFetch } = useAuth();

  const seriesQuery = useQuery({
    queryKey: ['metric-series', period, service],
    queryFn: () =>
      getMetricSeries(apiFetch, { period, service: service || undefined }),
    // Buckets are minutes wide, so once a minute is enough even in live mode.
    refetchInterval: live ? LIVE_REFRESH_MS : false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const groups = useMemo(
    () => groupByName(seriesQuery.data?.series ?? []),
    [seriesQuery.data],
  );

  return {
    groups,
    isLoading: seriesQuery.isLoading,
    error: seriesQuery.error,
  };
}
