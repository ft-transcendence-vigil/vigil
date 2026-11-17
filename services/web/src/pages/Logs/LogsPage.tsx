import { useEffect, useRef, useState } from 'react';
import LogsFilters from '../../components/Logs/LogsFilters';
import LogsRow, { type LogsSeverity } from '../../components/Logs/LogsRow';
import LogsSummary from '../../components/Logs/LogsSummary';
import SwitchButton from '../../components/shared/SwitchButton';
import useLogs from '../../hooks/useLogs';
import useLogsFilter from '../../hooks/useLogsFilter';
import useLiveLogs from '../../hooks/useLiveLogs';
import type { Log } from '../../api/logsApi';
import Button from '../../components/shared/Button';

export type LiveLogsStatus = 'paused' | 'connecting...' | 'live';

export default function LogsPage() {
  const loadMoreRef = useRef<HTMLTableRowElement | null>(null);
  const filter = useLogsFilter();
  const [isLive, setIsLive] = useState(false);
  const topRef = useRef<HTMLDivElement | null>(null);
  const [isNearTop, setIsNearTop] = useState(true);
  const [liveLogs, setLiveLogs] = useState<Log[]>([]);
  const [pendingLogs, setPendingLogs] = useState<Log[]>([]);
  const MAX_LIVE_LOGS = 200;
  const [connectionStatus, setConnectionStatus] =
    useState<LiveLogsStatus>('paused');

  const matchesCurrentFilters = (log: Log) => {
    if (filter.params.service && log.service !== filter.params.service) {
      return false;
    }

    if (filter.severity && log.severity !== filter.severity) {
      return false;
    }

    if (
      filter.params.search &&
      !log.message.toLowerCase().includes(filter.params.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  };

  const handleLiveLog = (log: Log) => {
    if (!matchesCurrentFilters(log)) {
      return;
    }
    if (isNearTop) {
      setLiveLogs((prev) => [log, ...prev].slice(0, MAX_LIVE_LOGS));
    } else {
      setPendingLogs((prev) => [log, ...prev].slice(0, MAX_LIVE_LOGS));
    }
  };

  useLiveLogs({
    service: filter.params.service,
    severity: filter.severity as LogsSeverity,
    enabled: isLive,
    onLog: handleLiveLog,
    onError: () => setIsLive(false),
    setConnectionStatus,
  });

  const {
    logs,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    handleExportCsv,
    isLoading,
    isError,
    error,
    refetch,
  } = useLogs(filter.params);

  const logsSummary = {
    loaded: 0,
    error: 0,
    warning: 0,
  };

  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

  const getLogFingerprint = (log: Log) => {
    return JSON.stringify([
      log.service,
      log.timestamp,
      log.severity,
      log.message,
      log.attributes,
    ]);
  };

  const filteredLiveLogs = liveLogs.filter(matchesCurrentFilters);

  const allLogs = Array.from(
    new Map(
      [...filteredLiveLogs, ...logs].map((log) => [
        getLogFingerprint(log),
        log,
      ]),
    ).values(),
  );

  allLogs.forEach((log) => {
    logsSummary.loaded++;
    if (log.severity === 'error' || log.severity === 'warning')
      logsSummary[log.severity]++;
  });

  const hasActiveFilters =
    Boolean(filter.period) ||
    Boolean(filter.service) ||
    Boolean(filter.severity) ||
    Boolean(filter.search);

  const handleShowNewLogs = () => {
    setLiveLogs((prev) => [...pendingLogs, ...prev].slice(0, MAX_LIVE_LOGS));
    setPendingLogs([]);
    document.getElementById('dashboard-scroll-container')?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const liveLogKeys = new Set(liveLogs.map((log) => getLogFingerprint(log)));

  const sortedLogs = [...allLogs].sort((a, b) => {
    switch (filter.sort) {
      case 'service':
        return a.service.localeCompare(b.service);
      case 'severity':
        return a.severity.localeCompare(b.severity);
      case 'message':
        return a.message.localeCompare(b.message);
      case 'timestamp':
      default:
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }
  });

  useEffect(() => {
    if (!topRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsNearTop(entry.isIntersecting);
        if (entry.isIntersecting && pendingLogs.length > 0) {
          setLiveLogs((prev) =>
            [...pendingLogs, ...prev].slice(0, MAX_LIVE_LOGS),
          );
          setPendingLogs([]);
        }
      },
      {
        rootMargin: '200px 0px 0px 0px',
      },
    );
    observer.observe(topRef.current);

    return () => observer.disconnect();
  }, [pendingLogs]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target) return;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];

      if (entry.isIntersecting && hasMore && !isFetchingNextPage) {
        fetchNextPage();
      }
    });
    observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      {pendingLogs.length > 0 && (
        <Button
          value={`▴ ${pendingLogs.length} new ${pendingLogs.length === 1 ? 'log' : 'logs'}`}
          className="fixed left-1/2 z-99 px-8! py-2.5!"
          onClick={handleShowNewLogs}
        />
      )}
      <div className="flex justify-between items-center mb-7">
        <div className="flex items-center space-x-4">
          <SwitchButton
            checked={isLive}
            onCheckedChange={() => setIsLive((prev) => !prev)}
          />
          <span className="text-2xl text-vigil-muted capitalize">
            {connectionStatus}
          </span>
        </div>
        <button
          className="text-[12px] md:text-[13px] cursor-pointer border border-vigil-border py-3 px-5 text-vigil-muted hover:border-vigil-text/60 hover:text-vigil-text/60 transition-[color,border-color] duration-300"
          onClick={() => handleExportCsv(filter.params)}
        >
          Export CSV
        </button>
      </div>
      <LogsFilters {...filter} />
      <LogsSummary
        loaded={logsSummary.loaded}
        errors={logsSummary.error}
        warnings={logsSummary.warning}
      />
      <div ref={topRef} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-250 border-collapse border border-vigil-border">
          <thead>
            <tr className="border-b border-vigil-border uppercase text-left text-vigil-muted text-[12px] md:text-[13px] bg-vigil-panel tracking-wide">
              <th className="py-2 md:py-4 px-2 md:px-3">Time</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Service</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Severity</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Message</th>
            </tr>
          </thead>
          <tbody className="bg-vigil-card">
            {isLoading && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-vigil-muted">
                  Loading logs...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="py-15 text-center">
                  <h1 className="text-[20px] mb-1">Could not load logs</h1>
                  <p className="text-vigil-state-danger-text text-[14px] tracking-wider">
                    {error instanceof Error
                      ? error.message
                      : 'Something went wrong.'}
                  </p>
                  <button
                    className="text-[12px] md:text-[13px] cursor-pointer border border-vigil-border mt-5 py-2 px-5 text-vigil-muted hover:border-vigil-text/60 hover:text-vigil-text/60 transition-[color,border-color] duration-300"
                    onClick={() => refetch()}
                  >
                    Retry
                  </button>
                </td>
              </tr>
            )}
            {!isLoading && !isError && allLogs.length === 0 && (
              <tr>
                <td colSpan={4} className="py-15 text-center">
                  {hasActiveFilters ? (
                    <>
                      <h1 className="text-[20px] mb-1">
                        No logs match these filters
                      </h1>
                      <p className="text-vigil-muted text-[14px] tracking-wider">
                        Adjust or clear the active filters.
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-[20px] mb-1">No logs found</h1>
                      <p className="text-vigil-muted text-[14px] tracking-wider">
                        Connect and instrument a service to start receiving
                        logs.
                      </p>
                    </>
                  )}
                </td>
              </tr>
            )}
            {!isLoading &&
              !isError &&
              sortedLogs.map((log) => {
                const key = getLogFingerprint(log);

                return (
                  <LogsRow
                    key={key}
                    time={formatDate(log.timestamp)}
                    service={log.service}
                    severity={log.severity as LogsSeverity}
                    message={log.message}
                    attributes={log.attributes}
                    isLive={liveLogKeys.has(key)}
                  />
                );
              })}
            {!isLoading && !isError && allLogs.length > 0 && (
              <tr ref={loadMoreRef}>
                <td
                  colSpan={4}
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
