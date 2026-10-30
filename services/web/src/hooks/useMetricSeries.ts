import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/authContext';
import { getMetricSeries, type Period } from '../api/metricsApi';
import { groupByName } from '../components/Metrics/metricData';

interface Params {
  period: Period;
  service: string;
  showInternal: boolean;
  live: boolean;
}

const LIVE_REFRESH_MS = 60_000;

export default function useMetricSeries({
  period,
  service,
  showInternal,
  live,
}: Params) {
  const { apiFetch } = useAuth();

  const seriesQuery = useQuery({
    queryKey: ['metric-series', period, service, showInternal],
    queryFn: () =>
      getMetricSeries(apiFetch, {
        period,
        service: service || undefined,
        internalOnly: showInternal ? undefined : false,
      }),
    // Buckets are minutes wide, so once a minute is enough even in live mode.
    refetchInterval: (query) =>
      live && query.state.data !== null ? LIVE_REFRESH_MS : false,
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
    isUnavailable: seriesQuery.data === null,
  };
}
