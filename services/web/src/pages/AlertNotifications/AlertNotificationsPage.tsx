import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import useAlertNotifications from '../../hooks/useAlertNotifications';
import NotificationButton from '../../components/AlertNotifications/NotificationButton';
import AlertNotificationsHeader from '../../components/AlertNotifications/AlertNotificationsHeader';
import AlertNotificationsTabs, {
  type Tab,
} from '../../components/AlertNotifications/AlertNotificationsTabs';
import AlertNotificationRow from '../../components/AlertNotifications/AlertNotificationRow';
import AlertNotificationLoadMoreButton from '../../components/AlertNotifications/AlertNotificationsLoadMore';

export default function AlertNotificationsPage() {
  const { apiFetch, user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const {
    notifications,
    isLoading,
    isError,
    error,
    fetchNextPage,
    isFetchingNextPage,
    hasMore,
    updateSeen,
    updatingNotificationId,
  } = useAlertNotifications({ apiFetch, userId: user!.id });
  const unseenCount = notifications.filter(
    (notification) => !notification.seen,
  ).length;
  const visibleNotifications =
    tab === 'unseen'
      ? notifications.filter((notification) => !notification.seen)
      : notifications;
  const panelRef = useRef<HTMLDivElement>(null);

  const handleOpen = (id: string) => {
    const notification = notifications.find(
      (notification) => notification.alert_history_id === id,
    );

    if (notification && !notification.seen) {
      updateSeen({
        id,
        seen: true,
      });
    }
    setIsOpen(false);
    navigate(`/alerts?alert=${encodeURIComponent(id)}`);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={panelRef} className="relative">
      <NotificationButton
        notificationNumber={unseenCount}
        onClick={() => setIsOpen((prev) => !prev)}
      />
      {isOpen && (
        <div className="fixed left-3 right-3 top-16 z-99 max-h-[calc(100dvh-5rem)] overflow-y-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-90 sm:max-h-[70vh] bg-vigil-panel">
          <AlertNotificationsHeader unseenCount={unseenCount} />
          <AlertNotificationsTabs tab={tab} onChange={setTab} />
          <div className="max-h-95 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-9 text-center text-xs text-vigil-muted-extra">
                Loading notifications...
              </p>
            ) : isError ? (
              <p className="px-4 py-9 text-center text-xs text-vigil-state-danger-text">
                {error instanceof Error
                  ? error.message
                  : 'Unable to load notifications.'}
              </p>
            ) : visibleNotifications.length === 0 ? (
              <p className="px-4 py-9 text-center text-xs text-vigil-muted-extra">
                {tab === 'unseen'
                  ? 'No unseen notifications.'
                  : 'No notifications.'}
              </p>
            ) : (
              visibleNotifications.map((notification) => (
                <AlertNotificationRow
                  key={notification.alert_history_id}
                  notification={notification}
                  isUpdating={
                    updatingNotificationId === notification.alert_history_id
                  }
                  onToggleSeen={(id, seen) => updateSeen({ id, seen })}
                  onOpen={handleOpen}
                />
              ))
            )}
          </div>
          {hasMore && (
            <AlertNotificationLoadMoreButton
              onClick={() => fetchNextPage()}
              isLoading={isFetchingNextPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
