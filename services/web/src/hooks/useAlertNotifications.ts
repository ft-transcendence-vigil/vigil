import {
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { ApiFetch } from '../api/api';
import {
  getAlertNotifications,
  updateAlertNotificationSeen,
  type AlertNotification,
  type AlertNotificationsResponse,
} from '../api/alertNotificationsApi';
import { toast } from 'sonner';

interface Data {
  apiFetch: ApiFetch;
  userId: string;
}

const PAGE_SIZE = 20;

export const alertNotificationsKey = (userId: string) =>
  ['alert-notifications', userId] as const;

export const updateAlertNotificationCache = (
  queryClient: QueryClient,
  userId: string,
  incoming: AlertNotification,
) => {
  queryClient.setQueryData<InfiniteData<AlertNotificationsResponse>>(
    alertNotificationsKey(userId),
    (oldData) => {
      if (!oldData) return oldData;

      const exists = oldData.pages.some((page) =>
        page.notifications.some(
          (notification) =>
            notification.alert_history_id === incoming.alert_history_id,
        ),
      );

      if (exists) {
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((notification) =>
              notification.alert_history_id === incoming.alert_history_id
                ? incoming
                : notification,
            ),
          })),
        };
      }

      return {
        ...oldData,
        pages: oldData.pages.map((page, index) =>
          index === 0
            ? {
                ...page,
                notifications: [incoming, ...page.notifications],
              }
            : page,
        ),
      };
    },
  );
};

export default function useAlertNotifications({ apiFetch, userId }: Data) {
  const queryClient = useQueryClient();

  const notificationsQuery = useInfiniteQuery({
    queryKey: alertNotificationsKey(userId),

    initialPageParam: undefined as string | undefined,

    queryFn: ({ pageParam }) =>
      getAlertNotifications(apiFetch, {
        count: PAGE_SIZE,
        before: pageParam,
      }),

    staleTime: 5 * 60_000,

    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more) {
        return undefined;
      }

      return lastPage.notifications[lastPage.notifications.length - 1]
        ?.triggered_at;
    },
  });

  const updateSeenMutation = useMutation({
    mutationFn: ({ id, seen }: { id: string; seen: boolean }) =>
      updateAlertNotificationSeen(apiFetch, id, seen),

    onSuccess: (updated) => {
      queryClient.setQueryData<InfiniteData<AlertNotificationsResponse>>(
        alertNotificationsKey(userId),
        (oldData) => {
          if (!oldData) return oldData;

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((notification) =>
                notification.alert_history_id === updated.alert_id
                  ? {
                      ...notification,
                      seen: updated.seen,
                      seen_at: updated.seen_at,
                    }
                  : notification,
              ),
            })),
          };
        },
      );
    },

    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    },
  });

  const updateCachedNotification = (incoming: AlertNotification) => {
    updateAlertNotificationCache(queryClient, userId, incoming);
  };

  const notifications =
    notificationsQuery.data?.pages.flatMap((page) => page.notifications) ?? [];

  return {
    notifications,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    error: notificationsQuery.error,
    fetchNextPage: notificationsQuery.fetchNextPage,
    isFetchingNextPage: notificationsQuery.isFetchingNextPage,
    hasMore: notificationsQuery.hasNextPage,
    refetch: notificationsQuery.refetch,
    updateSeen: updateSeenMutation.mutate,
    updatingNotificationId: updateSeenMutation.isPending
      ? updateSeenMutation.variables?.id
      : undefined,
    updateSeenError: updateSeenMutation.error,
    updateCachedNotification,
  };
}
