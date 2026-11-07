import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import { useState } from 'react';
import DesktopSidebar from './Sidebar/DesktopSidebar';
import MobileSidebar from './Sidebar/MobileSidebar';
import { getPageTitle } from './Sidebar/dashboardNavigation';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import useAlertsWebSocket from '../../hooks/useAlertsWebSocket';
import { emitAlert, emitLlm } from '../../Realtime/alertsRealtime';
import {
  alertNotificationsKey,
  updateAlertNotificationCache,
} from '../../hooks/useAlertNotifications';
import {
  updateAlertNotificationSeen,
  type AlertNotificationsResponse,
  type AlertNotification,
} from '../../api/alertNotificationsApi';
import { toast } from 'sonner';
import { useAuth } from '../../auth/authContext';
import AIDrawer from './AIDrawer/AIDrawer';
import { AIDrawerProvider } from './AIDrawer/AIDrawerProvider';

function DashboardContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = getPageTitle(location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user, apiFetch } = useAuth();

  const showAlertToast = (notification: AlertNotification) => {
    if (!user) return;

    const options = {
      description: `${notification.service} · ${
        notification.signal_type ?? 'unknown'
      }`,
      position: 'top-right' as const,
      action: {
        label: 'View',
        onClick: async () => {
          try {
            const updated = await updateAlertNotificationSeen(
              apiFetch,
              notification.alert_history_id,
              true,
            );
            updateAlertNotificationCache(queryClient, user.id, {
              ...notification,
              seen: updated.seen,
              seen_at: updated.seen_at,
            });
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : 'Failed to mark notification as seen',
            );
          }
          navigate(
            `/alerts?alert=${encodeURIComponent(
              notification.alert_history_id,
            )}`,
          );
        },
      },
    };

    const title = `New alert · ${notification.service}`;

    switch (notification.severity) {
      case 'critical':
        toast.error(title, options);
        break;
      case 'warning':
        toast.warning(title, options);
        break;
      case 'info':
      default:
        toast.info(title, options);
        break;
    }
  };

  const { isConnected } = useAlertsWebSocket({
    onAlert: (alert) => {
      emitAlert(alert);
    },

    onNotification: (notification) => {
      if (!user) return;

      const queryKey = alertNotificationsKey(user.id);
      const cached =
        queryClient.getQueryData<InfiniteData<AlertNotificationsResponse>>(
          queryKey,
        );
      const alreadyExists =
        cached?.pages.some((page) =>
          page.notifications.some(
            (item) => item.alert_history_id === notification.alert_history_id,
          ),
        ) ?? false;

      updateAlertNotificationCache(queryClient, user.id, notification);
      if (alreadyExists || notification.seen) {
        return;
      }
      showAlertToast(notification);
    },

    onLlm: (data) => {
      emitLlm(data);
    },

    onServerError: (message) => {
      toast.error(message);
    },

    onReconnect: () => {
      queryClient.invalidateQueries({
        queryKey: ['alert-history'],
      });

      if (!user) return;

      queryClient.invalidateQueries({
        queryKey: alertNotificationsKey(user.id),
      });
    },
  });

  return (
    <div className="dashboard-layout flex h-dvh overflow-hidden">
      <DesktopSidebar isConnected={isConnected} />
      <MobileSidebar
        isConnected={isConnected}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="dashboard-bg flex min-h-0 min-w-0 flex-1 flex-col bg-vigil-bg">
        <Header
          title={title}
          onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
        />
        <div
          id="dashboard-scroll-container"
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5"
        >
          <Outlet />
        </div>
      </main>
      <AIDrawer />
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <AIDrawerProvider>
      <DashboardContent />
    </AIDrawerProvider>
  );
}
