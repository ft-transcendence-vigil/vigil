import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { ApiFetch } from '../api/api';
import {
  getAlertHistory,
  updateAlertStatus,
  type AlertHistory,
  type AlertHistoryParams,
  type AlertHistoryResponse,
  type AlertStatus,
} from '../api/alertHistoryApi';
import { toast } from 'sonner';

interface UseAlertsParams {
  apiFetch: ApiFetch;
  period: '' | AlertHistoryParams['period'];
  service?: string;
  pageSize?: number;
  before?: string;
}

const PAGE_SIZE = 20;

export default function useAlerts({
  apiFetch,
  period,
  service,
  pageSize = PAGE_SIZE,
  before,
}: UseAlertsParams) {
  const queryClient = useQueryClient();

  const alertsQuery = useInfiniteQuery({
    queryKey: ['alert-history', period, service, pageSize, before],
    initialPageParam: undefined as string | undefined,

    queryFn: ({ pageParam }) =>
      getAlertHistory(apiFetch, {
        period: period || undefined,
        service: service || undefined,
        count: pageSize,
        before: pageParam ?? before,
      }),

    staleTime: 5 * 60_000,

    getNextPageParam: (lastPage) => {
      const hasMore = lastPage.has_more ?? lastPage.hasMore;
      if (!hasMore) {
        return undefined;
      }
      return lastPage.data[lastPage.data.length - 1]?.triggered_at;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AlertStatus }) =>
      updateAlertStatus(apiFetch, id, status),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['alert-history'],
      });
      toast.success('Alert status updated successfully');
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    },
  });

  const updateCachedAlert = (incoming: AlertHistory) => {
    queryClient.setQueryData<InfiniteData<AlertHistoryResponse>>(
      ['alert-history', period, service, pageSize, before],
      (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((alert) => {
              if (alert.id !== incoming.id) return alert;
              if (incoming.version <= alert.version) return alert;
              return incoming;
            }),
          })),
        };
      },
    );
  };

  const updateCachedLlm = (id: string, llmAnalysis: string) => {
    queryClient.setQueryData<InfiniteData<AlertHistoryResponse>>(
      ['alert-history', period, service, pageSize, before],
      (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((alert) =>
              alert.id === id ? { ...alert, llm_analysis: llmAnalysis } : alert,
            ),
          })),
        };
      },
    );
  };

  const alerts = alertsQuery.data?.pages.flatMap((page) => page.data) ?? [];

  return {
    alerts,
    isLoading: alertsQuery.isLoading,
    isError: alertsQuery.isError,
    error: alertsQuery.error,
    fetchNextPage: alertsQuery.fetchNextPage,
    isFetchingNextPage: alertsQuery.isFetchingNextPage,
    hasMore: alertsQuery.hasNextPage,
    refetch: alertsQuery.refetch,
    updateStatus: updateStatusMutation.mutate,
    updatingAlertId: updateStatusMutation.isPending
      ? updateStatusMutation.variables?.id
      : undefined,
    updateStatusError: updateStatusMutation.error,
    updateCachedAlert,
    updateCachedLlm,
  };
}
