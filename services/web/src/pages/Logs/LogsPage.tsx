import { useEffect, useRef } from 'react';
import LogsFilters from '../../components/Logs/LogsFilters';
import LogsRow, { type LogsSeverity } from '../../components/Logs/LogsRow';
import LogsSummary from '../../components/Logs/LogsSummary';
import SwitchButton from '../../components/shared/SwitchButton';
import useLogs from '../../hooks/useLogs';
import useLogsFilter from '../../hooks/useLogsFilter';

export default function LogsPage() {
  const loadMoreRef = useRef(null);
  const filter = useLogsFilter();
  const { logs, hasMore, fetchNextPage, isFetchingNextPage, handleExportCsv } =
    useLogs(filter.params);
  const logsSummary = {
    loaded: 0,
    error: 0,
    warning: 0,
  };

  logs.forEach((log) => {
    logsSummary.loaded++;
    if (log.severity === 'error' || log.severity === 'warning')
      logsSummary[log.severity]++;
  });

  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

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
      <div className="flex justify-between items-center mb-7">
        <div className="flex items-center space-x-4">
          <SwitchButton checked={true} onCheckedChange={() => 1 + 1} />
          <span className="text-2xl text-vigil-muted">Live</span>
        </div>
        <button
          className="text-[12px] md:text-[13px] cursor-pointer border border-vigil-border py-3 px-5 text-vigil-muted hover:border-white/60 hover:text-white/60 transition-[color,border-color] duration-300"
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-250 border-collapse border border-vigil-border">
          <thead>
            <tr className="border-b border-vigil-border uppercase text-left text-vigil-muted text-[12px] md:text-[13px] bg-[#0D1425] tracking-wide">
              <th className="py-2 md:py-4 px-2 md:px-3">Time</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Service</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Severity</th>
              <th className="py-2 md:py-4 px-2 md:px-3">Message</th>
            </tr>
          </thead>
          <tbody className="bg-vigil-card">
            {logs.map((log) => (
              <LogsRow
                key={`${log.timestamp}-${log.service}-${log.message}`}
                time={formatDate(log.timestamp)}
                service={log.service}
                severity={log.severity as LogsSeverity}
                message={log.message}
                attributes={log.attributes}
              />
            ))}
            <tr ref={loadMoreRef}>
              <td
                colSpan={4}
                className="text-center text-vigil-muted-extra py-2.5"
              >
                {hasMore ? 'Loading more...' : '- end of results -'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
