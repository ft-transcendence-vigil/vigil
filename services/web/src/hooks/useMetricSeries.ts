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

//refrech every min
const LIVE_REFRESH_MS = 60_000;

export default function useMetricSeries({ period, service, live }: Params) {
  const { apiFetch } = useAuth();
//usequery is react query for data that comes in one response with no pages (useinfinitequery is the paged version)
  //it fetches, caches the result under the querykey, tracks isLoading and error, and re renders the page when data arrives
  //seriesQuery.data is the response itself { interval_seconds, series } not { pages: [...] }
  const seriesQuery = useQuery({
    //cache name: a new period or service gives a new key so it fetches again automatically
    //live is not in the key because it doesnt change which data we want, only how often we refresh it
    queryKey: ['metric-series', period, service],
    //func that gets us the data we specify in it how to fetch: no pageParam because there are no pages. empty service becomes undefined so its left out of the url
    queryFn: () =>
      getMetricSeries(apiFetch, { period, service: service || undefined }),
    //it tells React Query to fetch this query again on a timer if not false
    refetchInterval: live ? LIVE_REFRESH_MS : false,
    //dont refetch when coming back to the tab and dont retry on failure (chosen for the old 10 requests/min limit)
    refetchOnWindowFocus: false,
    retry: false,
  });

  //group the series by metric name: one group = one chart, with one series (line) per service
  //useMemo so we only regroup when new data arrives
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
