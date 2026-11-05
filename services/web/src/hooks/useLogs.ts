import { useInfiniteQuery } from '@tanstack/react-query';
import { exportLogsCsv, getLogs, type LogsParams } from '../api/logsApi';
import { useAuth } from '../auth/authContext';
import { toast } from 'sonner';

export default function useLogs(params: LogsParams) {
  const { apiFetch } = useAuth();
  const isTimestampSort = !params.sort || params.sort === 'timestamp';

  const logsQuery = useInfiniteQuery({
    queryKey: ['logs', params],
    queryFn: ({ pageParam }) =>
      getLogs(apiFetch, {
        ...params,
        before: isTimestampSort ? (pageParam as string | undefined) : undefined,
        offset: !isTimestampSort
          ? ((pageParam as number | undefined) ?? 0)
          : undefined,
      }),
    staleTime: 5 * 60_000,
    initialPageParam: undefined as string | number | undefined,

    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      if (isTimestampSort) return lastPage.data.at(-1)?.timestamp;
      return allPages.reduce((total, page) => total + page.data.length, 0);
    },
  });

  const handleExportCsv = async (params: LogsParams) => {
    try {
      const blob = await exportLogsCsv(apiFetch, params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'logs.csv';
      link.click();

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to export logs',
      );
    }
  };

  return {
    logs: logsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    hasMore: logsQuery.hasNextPage,
    isLoading: logsQuery.isLoading,
    isError: logsQuery.isError,
    error: logsQuery.error,
    refetch: logsQuery.refetch,
    fetchNextPage: logsQuery.fetchNextPage,
    isFetchingNextPage: logsQuery.isFetchingNextPage,
    handleExportCsv,
  };
}
