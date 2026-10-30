import { useMemo } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../auth/authContext';
import { exportMetricsCsv, getMetrics, type Period } from '../api/metricsApi';
import { downloadBlob } from '../components/shared/utils/format';

interface Params {
  period: Period;
  service: string;
  showInternal: boolean;
}

export const METRICS_PAGE_SIZE = 50;

export default function useMetrics({ period, service, showInternal }: Params) {
  const { apiFetch } = useAuth();
  // vigil.internal=false hides internal metrics; leaving it out returns everything.
  const internalOnly = showInternal ? undefined : false;

  const metricsQuery = useInfiniteQuery({
    queryKey: ['metrics', period, service, showInternal],
    queryFn: ({ pageParam }) =>
      getMetrics(apiFetch, {
        period,
        service: service || undefined,
        internalOnly,
        count: METRICS_PAGE_SIZE,
        before: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.data.at(-1)?.timestamp : undefined,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const exportMutation = useMutation({
    mutationFn: () =>
      exportMetricsCsv(apiFetch, {
        period,
        service: service || undefined,
        internalOnly,
      }),
    onSuccess: (blob) => downloadBlob(blob, `vigil-metrics-${period}.csv`),
    onError: (error) => toast.error(error.message),
  });

  const metrics = useMemo(
    () => metricsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [metricsQuery.data],
  );

  return {
    metrics,
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
    hasNextPage: metricsQuery.hasNextPage,
    fetchNextPage: metricsQuery.fetchNextPage,
    isFetchingNextPage: metricsQuery.isFetchingNextPage,
    exportCsv: exportMutation.mutate,
    isExporting: exportMutation.isPending,
  };
}
