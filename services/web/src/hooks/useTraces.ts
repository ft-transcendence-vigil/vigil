import { useMemo } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../auth/authContext';
import { exportTracesCsv, getTraces, type Period } from '../api/tracesApi';
import { downloadBlob } from '../components/shared/utils/format';

interface Params {
  period: Period;
  service: string;
}

export const TRACES_PAGE_SIZE = 50;

export default function useTraces({ period, service }: Params) {
  const { apiFetch } = useAuth();

  const tracesQuery = useInfiniteQuery({
    queryKey: ['traces', period, service],
    queryFn: ({ pageParam }) =>
      getTraces(apiFetch, {
        period,
        service: service || undefined,
        count: TRACES_PAGE_SIZE,
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
      exportTracesCsv(apiFetch, { period, service: service || undefined }),
    onSuccess: (blob) => downloadBlob(blob, `vigil-traces-${period}.csv`),
    onError: (error) => toast.error(error.message),
  });

  const traces = useMemo(
    () => tracesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [tracesQuery.data],
  );

  return {
    traces,
    isLoading: tracesQuery.isLoading,
    error: tracesQuery.error,
    hasNextPage: tracesQuery.hasNextPage,
    fetchNextPage: tracesQuery.fetchNextPage,
    isFetchingNextPage: tracesQuery.isFetchingNextPage,
    exportCsv: exportMutation.mutate,
    isExporting: exportMutation.isPending,
  };
}
