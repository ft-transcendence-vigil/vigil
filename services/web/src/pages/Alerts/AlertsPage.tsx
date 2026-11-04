import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/authContext';
import AlertsFilters, {
  type Period,
} from '../../components/Alerts/AlertsFilters';
import AlertsRow from '../../components/Alerts/AlertsRow';
import useAlerts from '../../hooks/useAlerts';
import useAlertsWebSocket, {
  type LlmUpdate,
} from '../../hooks/useAlertsWebSocket';
import type { AlertHistory } from '../../api/alertHistoryApi';
import Button from '../../components/shared/Button';
import { toast } from 'sonner';

export default function AlertsPage() {
  const [period, setPeriod] = useState<Period>('24h');
  const [service, setService] = useState('');
  const [debouncedService, setDebouncedService] = useState('');
  const loadMoreRef = useRef<HTMLTableRowElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const [isNearTop, setIsNearTop] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState<AlertHistory[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<AlertHistory[]>([]);
  const { apiFetch, user } = useAuth();
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

  const handleLiveAlert = (incoming: AlertHistory) => {
    const historical = alerts.find((alert) => alert.id === incoming.id);

    if (historical) {
      updateCachedAlert(incoming);
      return;
    }

    const live = liveAlerts.find((alert) => alert.id === incoming.id);

    if (live) {
      if (incoming.version <= live.version) return;
      setLiveAlerts((prev) =>
        prev.map((alert) => (alert.id === incoming.id ? incoming : alert)),
      );
      return;
    }

    const pending = pendingAlerts.find((alert) => alert.id === incoming.id);

    if (pending) {
      if (incoming.version <= pending.version) return;
      setPendingAlerts((prev) =>
        prev.map((alert) => (alert.id === incoming.id ? incoming : alert)),
      );
      return;
    }

    if (debouncedService && incoming.service !== debouncedService) return;

    if (isNearTop) {
      setLiveAlerts((prev) => [incoming, ...prev]);
    } else {
      setPendingAlerts((prev) => [incoming, ...prev]);
    }
  };

  const allAlerts = Array.from(
    new Map(
      [...alerts, ...liveAlerts].map((alert) => [alert.id, alert]),
    ).values(),
  ).sort(
    (a, b) =>
      new Date(b.triggered_at).getTime() - new Date(a.triggered_at).getTime(),
  );

  const liveAlertIds = new Set(liveAlerts.map((alert) => alert.id));

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

  const handleLlmUpdate = (data: LlmUpdate) => {
    updateCachedLlm(data.id, data.llm_analysis);

    setLiveAlerts((prev) =>
      prev.map((alert) =>
        alert.id === data.id
          ? { ...alert, llm_analysis: data.llm_analysis }
          : alert,
      ),
    );

    setPendingAlerts((prev) =>
      prev.map((alert) =>
        alert.id === data.id
          ? { ...alert, llm_analysis: data.llm_analysis }
          : alert,
      ),
    );
  };

  const handleServerError = (message: string) => {
    toast.error(message);
  };

  const handleReconnect = () => {
    refetch();
  };

  useAlertsWebSocket({
    onAlert: handleLiveAlert,
    onLlm: handleLlmUpdate,
    onServerError: handleServerError,
    onReconnect: handleReconnect,
  });

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
      {pendingAlerts.length > 0 && (
        <Button
          value={`▴ ${pendingAlerts.length} new ${
            pendingAlerts.length === 1 ? 'alert' : 'alerts'
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
            <tr className="border-b border-vigil-border uppercase text-left text-vigil-muted text-[12px] md:text-[13px] bg-[#0D1425] tracking-wide">
              <th className="py-2 md:py-4 px-2 md:px-3">Severity</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Service</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Metric</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Triggered</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Status</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Actions</th>
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
                  <h1 className="text-[20px] mb-1">Could not load alerts</h1>
                  <p className="text-red-400 text-[14px] tracking-wider">
                    {error instanceof Error
                      ? error.message
                      : 'Something went wrong.'}
                  </p>
                  <button
                    type="button"
                    className="text-[12px] md:text-[13px] cursor-pointer border border-vigil-border mt-5 py-2 px-5 text-vigil-muted hover:border-white/60 hover:text-white/60 transition-[color,border-color] duration-300"
                    onClick={() => refetch()}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && alerts.length === 0 && (
              <tr>
                <td colSpan={6} className="py-15 text-center">
                  <h1 className="text-[20px] mb-1">No alerts found</h1>
                  <p className="text-vigil-muted text-[14px] tracking-wider">
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
                    updateStatus({ id: alert.id, status })
                  }
                  isUpdatingStatus={updatingAlertId === alert.id}
                  currentUserId={user?.id}
                  isLive={liveAlertIds.has(alert.id)}
                />
              ))}
            {!isLoading && !isError && alerts.length > 0 && (
              <tr ref={loadMoreRef}>
                <td
                  colSpan={6}
                  className="text-center text-vigil-muted-extra py-2.5"
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
