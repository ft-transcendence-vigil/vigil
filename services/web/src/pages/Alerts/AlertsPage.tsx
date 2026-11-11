import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import type { AlertHistory } from '../../api/alertHistoryApi';
import AlertsFilters, {
  type Period,
} from '../../components/Alerts/AlertsFilters';
import AlertsRow from '../../components/Alerts/AlertsRow';
import Button from '../../components/shared/Button';
import useAlerts from '../../hooks/useAlerts';
import { type LlmUpdate } from '../../hooks/useAlertsWebSocket';
import {
  subscribeToAlerts,
  subscribeToLlm,
} from '../../realtime/alertsRealtime';
import useAlertNotifications from '../../hooks/useAlertNotifications';

export default function AlertsPage() {
  const [period, setPeriod] = useState<Period>('24h');
  const [service, setService] = useState('');
  const [debouncedService, setDebouncedService] = useState('');
  const [isNearTop, setIsNearTop] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState<AlertHistory[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<AlertHistory[]>([]);
  const loadMoreRef = useRef<HTMLTableRowElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const { apiFetch, user } = useAuth();
  const [searchParams] = useSearchParams();
  const targetAlertId = searchParams.get('alert');
  const {
    alerts,
    isLoading,
    isError,
    error,
    fetchNextPage,
    isFetchingNextPage,
    hasMore,
    refetch,
    updateStatus,
    updatingAlertId,
    updateCachedAlert,
    updateCachedLlm,
  } = useAlerts({
    apiFetch,
    period,
    service: debouncedService,
  });

  const { notifications, updateSeen: updateNotificationSeen } =
    useAlertNotifications({
      apiFetch,
      userId: user!.id,
    });

  const unseenAlertIds = new Set(
    notifications
      .filter((notification) => !notification.seen)
      .map((notification) => notification.alert_history_id),
  );

  const updateAlertEverywhere = useCallback(
    (updatedAlert: AlertHistory) => {
      updateCachedAlert(updatedAlert);

      setLiveAlerts((prev) =>
        prev.map((alert) =>
          alert.id === updatedAlert.id ? updatedAlert : alert,
        ),
      );

      setPendingAlerts((prev) =>
        prev.map((alert) =>
          alert.id === updatedAlert.id ? updatedAlert : alert,
        ),
      );
    },
    [updateCachedAlert],
  );

  const handleLiveAlert = useCallback(
    (incoming: AlertHistory) => {
      const historical = alerts.find((alert) => alert.id === incoming.id);
      const live = liveAlerts.find((alert) => alert.id === incoming.id);
      const pending = pendingAlerts.find((alert) => alert.id === incoming.id);

      if (historical || live || pending) {
        const existing = [historical, live, pending].filter(
          (alert): alert is AlertHistory => alert !== undefined,
        );

        const newestExisting = existing.reduce((newest, alert) =>
          alert.version > newest.version ? alert : newest,
        );

        const newest =
          incoming.version >= newestExisting.version
            ? incoming
            : newestExisting;

        updateAlertEverywhere(newest);
        return;
      }

      if (debouncedService && incoming.service !== debouncedService) {
        return;
      }

      if (isNearTop) {
        setLiveAlerts((prev) => [incoming, ...prev]);
      } else {
        setPendingAlerts((prev) => [incoming, ...prev]);
      }
    },
    [
      alerts,
      liveAlerts,
      pendingAlerts,
      debouncedService,
      isNearTop,
      updateAlertEverywhere,
    ],
  );

  const handleLlmUpdate = useCallback(
    (data: LlmUpdate) => {
      updateCachedLlm(data.id, data.llm_analysis);

      setLiveAlerts((prev) =>
        prev.map((alert) =>
          alert.id === data.id
            ? {
                ...alert,
                llm_analysis: data.llm_analysis,
              }
            : alert,
        ),
      );

      setPendingAlerts((prev) =>
        prev.map((alert) =>
          alert.id === data.id
            ? {
                ...alert,
                llm_analysis: data.llm_analysis,
              }
            : alert,
        ),
      );
    },
    [updateCachedLlm],
  );

  const matchesServiceFilter = (alert: AlertHistory) =>
    !debouncedService || alert.service === debouncedService;

  const matchingPendingAlerts = pendingAlerts.filter(matchesServiceFilter);

  const allAlerts = Array.from(
    new Map(
      [...alerts, ...liveAlerts].map((alert) => [alert.id, alert]),
    ).values(),
  )
    .filter(matchesServiceFilter)
    .sort(
      (a, b) =>
        new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime(),
    );

  const liveAlertIds = new Set(liveAlerts.map((alert) => alert.id));
  const targetAlertLoaded =
    targetAlertId !== null &&
    allAlerts.some((alert) => alert.id === targetAlertId);

  function handleClear() {
    setPeriod('24h');
    setService('');
    setDebouncedService('');
  }

  const handleShowNewAlerts = () => {
    setLiveAlerts((prev) => [...pendingAlerts, ...prev]);
    setPendingAlerts([]);
    document.getElementById('dashboard-scroll-container')?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    if (!targetAlertId || !targetAlertLoaded) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      document.getElementById(`alert-${targetAlertId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [targetAlertId, targetAlertLoaded]);

  useEffect(() => {
    if (!targetAlertId) return;
    if (targetAlertLoaded) return;
    if (!hasMore) return;
    if (isFetchingNextPage) return;

    fetchNextPage();
  }, [
    targetAlertId,
    targetAlertLoaded,
    hasMore,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  useEffect(() => {
    const unsubscribe = subscribeToAlerts(handleLiveAlert);

    return () => unsubscribe();
  }, [handleLiveAlert]);

  useEffect(() => {
    const unsubscribe = subscribeToLlm(handleLlmUpdate);

    return () => unsubscribe();
  }, [handleLlmUpdate]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedService(service.trim());
    }, 400);

    return () => {
      clearTimeout(timeout);
    };
  }, [service]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        rootMargin: '300px',
      },
    );
    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!topRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearTop(entry.isIntersecting);
        if (entry.isIntersecting && pendingAlerts.length > 0) {
          setLiveAlerts((prev) => [...pendingAlerts, ...prev]);
          setPendingAlerts([]);
        }
      },
      {
        rootMargin: '200px 0px 0px 0px',
      },
    );
    observer.observe(topRef.current);

    return () => observer.disconnect();
  }, [pendingAlerts]);

  return (
    <>
      {matchingPendingAlerts.length > 0 && (
        <Button
          value={`▴ ${matchingPendingAlerts.length} new ${
            matchingPendingAlerts.length === 1 ? 'alert' : 'alerts'
          }`}
          className="fixed left-1/2 z-99 px-8! py-2.5!"
          onClick={handleShowNewAlerts}
        />
      )}
      <AlertsFilters
        period={period}
        service={service}
        handlePeriodOnChange={(event) =>
          setPeriod(event.target.value as Period)
        }
        handleServiceOnChange={(event) => setService(event.target.value)}
        handleClear={handleClear}
      />
      <div ref={topRef} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-250 border-collapse border border-vigil-border">
          <thead>
            <tr className="border-b border-vigil-border bg-[#0D1425] text-left text-[12px] tracking-wide text-vigil-muted uppercase md:text-[13px]">
              <th className="px-2 py-2 md:px-3 md:py-4">Severity</th>
              <th className="px-2 py-2 md:px-3 md:py-4">Service</th>
              <th className="px-2 py-2 md:px-3 md:py-4">Metric</th>
              <th className="px-2 py-2 md:px-3 md:py-4">Triggered</th>
              <th className="px-2 py-2 md:px-3 md:py-4">Status</th>
              <th className="px-2 py-2 md:px-3 md:py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-vigil-card">
            {isLoading && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-vigil-muted">
                  Loading alerts...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="py-15 text-center">
                  <h1 className="mb-1 text-[20px]">Could not load alerts</h1>
                  <p className="text-[14px] tracking-wider text-red-400">
                    {error instanceof Error
                      ? error.message
                      : 'Something went wrong.'}
                  </p>
                  <button
                    type="button"
                    className="mt-5 cursor-pointer border border-vigil-border px-5 py-2 text-[12px] text-vigil-muted transition-[color,border-color] duration-300 hover:border-white/60 hover:text-white/60 md:text-[13px]"
                    onClick={() => refetch()}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && allAlerts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-15 text-center">
                  <h1 className="mb-1 text-[20px]">No alerts found</h1>
                  <p className="text-[14px] tracking-wider text-vigil-muted">
                    Try another period or service.
                  </p>
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              allAlerts.map((alert) => (
                <AlertsRow
                  key={alert.id}
                  {...alert}
                  onStatusChange={(status) =>
                    updateStatus({
                      id: alert.id,
                      status,
                    })
                  }
                  isUpdatingStatus={updatingAlertId === alert.id}
                  currentUserId={user?.id}
                  isLive={liveAlertIds.has(alert.id)}
                  isTarget={alert.id === targetAlertId}
                  isUnseen={unseenAlertIds.has(alert.id)}
                  onSeen={() =>
                    updateNotificationSeen({
                      id: alert.id,
                      seen: true,
                    })
                  }
                />
              ))}
            {!isLoading && !isError && allAlerts.length > 0 && (
              <tr ref={loadMoreRef}>
                <td
                  colSpan={6}
                  className="py-2.5 text-center text-vigil-muted-extra"
                >
                  {isFetchingNextPage
                    ? 'Loading more...'
                    : hasMore
                      ? ''
                      : '- end of results -'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
