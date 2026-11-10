import { useCallback, useEffect, useMemo, useState } from 'react';
import AlertsPreview from '../../components/Overview/AlertsPreview/AlertsPreview';
import GeneralFilter, {
  type Range,
} from '../../components/Overview/GeneralFilter';
import KpiSection from '../../components/Overview/KpiCard/KpiSection';
import LogsPreview from '../../components/Overview/LogsPreview/LogsPreview';
import RequestPerformance from '../../components/Overview/RequestPerformance/RequestPerformance';
import ServicesPreview, {
  type ServicesFilter,
} from '../../components/Overview/ServicesPreview/ServicesPreview';
import {
  DAY,
  bucketSpans,
  describeAlert,
  inWindow,
  matchesAlertFilter,
  sortAlerts,
  summarizeServices,
  toDateInput,
  toWindow,
  type AlertFilter,
  type LogFilter,
} from '../../components/Overview/overviewData';
import { useAuth } from '../../auth/authContext';
import useAlerts from '../../hooks/useAlerts';
import useLogs from '../../hooks/useLogs';
import useTraces from '../../hooks/useTraces';
import useLiveLogs from '../../hooks/useLiveLogs';
import useLiveTraces from '../../hooks/useLiveTraces';
import type { LlmUpdate } from '../../hooks/useAlertsWebSocket';
import {
  subscribeToAlerts,
  subscribeToLlm,
} from '../../Realtime/alertsRealtime';
import type { AlertHistory } from '../../api/alertHistoryApi';
import type { Log } from '../../api/logsApi';
import type { LiveLogsStatus } from '../Logs/LogsPage';

// the api's max page sizes; up to 5 alert pages feed the kpis and the services state
const ALERT_PAGE = 100;
const ALERT_PAGES = 5;
const LOG_COUNT = 100;
const SPAN_COUNT = 500;
const MAX_LIVE = 200;
// moves the end of a live range forward so the chart and "last 1h" keep sliding
const TICK_MS = 15_000;
const ISSUES = ['warning', 'error', 'critical'];

export default function OverviewPage() {
  const { apiFetch, user } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [range, setRange] = useState<Range>('24h');
  const [from, setFrom] = useState(() => toDateInput(now - 2 * DAY));
  const [to, setTo] = useState(() => toDateInput(now));
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [service, setService] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('open');
  const [logFilter, setLogFilter] = useState<LogFilter>('issues');
  const [servicesFilter, setServicesFilter] = useState<ServicesFilter>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<AlertHistory[]>([]);
  const [liveLogs, setLiveLogs] = useState<Log[]>([]);
  const [, setLiveLogsStatus] = useState<LiveLogsStatus>('paused');

  const timeWindow = useMemo(
    () => toWindow(range, from, to, now),
    [range, from, to, now],
  );

  // one alerts query for the whole range: kpis, services and the alerts card all read it
  const {
    alerts,
    isLoading: alertsLoading,
    error: alertsError,
    hasMore: alertsHasMore,
    isFetchingNextPage: alertsFetchingMore,
    fetchNextPage: fetchMoreAlerts,
    updateStatus,
    updatingAlertId,
    updateCachedAlert,
    updateCachedLlm,
  } = useAlerts({
    apiFetch,
    period: timeWindow.period,
    pageSize: ALERT_PAGE,
    before: timeWindow.before,
  });

  const logsQuery = useLogs({
    period: timeWindow.period,
    service: service ?? undefined,
    search: query || undefined,
    count: LOG_COUNT,
    before: timeWindow.before,
  });

  const tracesQuery = useTraces({
    period: timeWindow.period,
    service: '',
    pageSize: SPAN_COUNT,
    before: timeWindow.before,
  });

  const { liveTraces } = useLiveTraces({
    enabled: timeWindow.live,
    service: '',
  });

  const handleLiveLog = useCallback((log: Log) => {
    setLiveLogs((prev) => [log, ...prev].slice(0, MAX_LIVE));
  }, []);

  useLiveLogs({
    service: service ?? undefined,
    enabled: timeWindow.live,
    onLog: handleLiveLog,
    setConnectionStatus: setLiveLogsStatus,
  });

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(timeout);
  }, [search]);

  // keep loading alert pages until the range is complete (or the cap is hit)
  useEffect(() => {
    if (!alertsHasMore || alertsFetchingMore) return;
    if (alerts.length >= ALERT_PAGE * ALERT_PAGES) return;
    fetchMoreAlerts();
  }, [alertsHasMore, alertsFetchingMore, alerts.length, fetchMoreAlerts]);

  // websocket "alert" frames: a status change (ack/resolve/reopen) of a known alert,
  // or a brand new alert. status frames carry no version, so the cached one is bumped by 1
  // like the server does, and the next refetch replaces it with the real row
  const handleLiveAlert = useCallback(
    (incoming: AlertHistory) => {
      const cached = alerts.find((a) => a.id === incoming.id);
      if (cached) {
        updateCachedAlert({
          ...cached,
          ...incoming,
          version: incoming.version ?? cached.version + 1,
        });
        return;
      }
      setLiveAlerts((prev) => {
        const index = prev.findIndex((a) => a.id === incoming.id);
        if (index === -1) return incoming.service ? [incoming, ...prev] : prev;
        const next = [...prev];
        next[index] = { ...prev[index], ...incoming };
        return next;
      });
    },
    [alerts, updateCachedAlert],
  );

  const handleLlm = useCallback(
    (data: LlmUpdate) => {
      updateCachedLlm(data.id, data.llm_analysis);
      setLiveAlerts((prev) =>
        prev.map((a) =>
          a.id === data.id ? { ...a, llm_analysis: data.llm_analysis } : a,
        ),
      );
    },
    [updateCachedLlm],
  );

  useEffect(() => subscribeToAlerts(handleLiveAlert), [handleLiveAlert]);
  useEffect(() => subscribeToLlm(handleLlm), [handleLlm]);

  const lowerQuery = query.toLowerCase();

  // every alert of the range, fetched + live, without duplicates
  const rangeAlerts = useMemo(() => {
    const byId = new Map<string, AlertHistory>();
    for (const a of [...alerts, ...liveAlerts])
      if (!byId.has(a.id) && inWindow(timeWindow, a.triggered_at))
        byId.set(a.id, a);
    return [...byId.values()];
  }, [alerts, liveAlerts, timeWindow]);

  const shownAlerts = useMemo(
    () =>
      sortAlerts(
        rangeAlerts.filter(
          (a) =>
            matchesAlertFilter(alertFilter, a) &&
            (!service || a.service === service) &&
            (!lowerQuery ||
              `${a.service} ${describeAlert(a)}`
                .toLowerCase()
                .includes(lowerQuery)),
        ),
      ),
    [rangeAlerts, alertFilter, service, lowerQuery],
  );

  // fetched spans + live spans, without duplicates, inside the range
  const spans = useMemo(() => {
    const seen = new Set<string>();
    return [...liveTraces, ...tracesQuery.traces].filter((s) => {
      if (seen.has(s.span_id) || !inWindow(timeWindow, s.timestamp))
        return false;
      seen.add(s.span_id);
      return true;
    });
  }, [liveTraces, tracesQuery.traces, timeWindow]);

  // the api returns at most 500 spans: when there are more, the chart and the rates
  // only cover the time those spans reach back to, instead of showing empty buckets
  const oldestSpan = tracesQuery.traces.at(-1);
  const sampled = tracesQuery.hasNextPage || range === 'all';
  const chartStart =
    sampled && oldestSpan
      ? Math.min(
          Math.max(timeWindow.start, new Date(oldestSpan.timestamp).getTime()),
          timeWindow.end - 60_000,
        )
      : timeWindow.start;
  const coveredMinutes = (timeWindow.end - chartStart) / 60_000;

  const services = useMemo(
    () => summarizeServices(rangeAlerts, spans, coveredMinutes),
    [rangeAlerts, spans, coveredMinutes],
  );

  const chartData = useMemo(
    () =>
      bucketSpans(
        service ? spans.filter((s) => s.service === service) : spans,
        chartStart,
        timeWindow.end,
      ),
    [spans, service, chartStart, timeWindow.end],
  );

  // fetched logs are already filtered by the api, live ones are filtered here
  const logs = useMemo(() => {
    const seen = new Set<string>();
    return [...liveLogs, ...logsQuery.logs]
      .filter((log) => {
        const key = `${log.timestamp}|${log.service}|${log.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return (
          inWindow(timeWindow, log.timestamp) &&
          (!service || log.service === service) &&
          (!lowerQuery || log.message.toLowerCase().includes(lowerQuery)) &&
          (logFilter === 'all' || ISSUES.includes(log.severity))
        );
      })
      .slice(0, LOG_COUNT);
  }, [liveLogs, logsQuery.logs, timeWindow, service, lowerQuery, logFilter]);

  const healthy = services.filter((s) => s.state === 'healthy').length;

  const handleRange = (next: Range) => {
    setRange(next);
    setNow(Date.now());
  };

  const handleExportPdf = async () => {
    const { exportOverviewPdf } =
      await import('../../components/Overview/report/OverviewReport');

    await exportOverviewPdf({
      period: timeWindow.label,
      critical: rangeAlerts.filter((a) => a.severity === 'critical').length,
      warning: rangeAlerts.filter((a) => a.severity === 'warning').length,
      unacknowledged: rangeAlerts.filter((a) => a.status === 'sent').length,
      healthy,
      services: services.length,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:h-full xl:min-h-0 xl:grid-cols-12 xl:grid-rows-[auto_minmax(0,13fr)_minmax(0,7fr)]">
      <div className="col-span-12">
        <p className="hidden print:block mb-3 text-[14px]">
          Vigil · Overview report · {timeWindow.label}
          {query && ` · search "${query}"`}
          {service && ` · ${service}`} · generated{' '}
          {new Date(now).toLocaleString()}
        </p>
        <GeneralFilter
          range={range}
          onRangeChange={handleRange}
          from={from}
          to={to}
          maxDate={toDateInput(now)}
          onDatesChange={(a, b) => {
            setFrom(a);
            setTo(b);
          }}
          search={search}
          onSearchChange={setSearch}
          service={service}
          onClearService={() => setService(null)}
          onExportLogs={() =>
            logsQuery.handleExportCsv({
              period: timeWindow.period,
              service: service ?? undefined,
              search: query || undefined,
            })
          }
          onExportPdf={handleExportPdf}
        />
        <KpiSection
          critical={rangeAlerts.filter((a) => a.severity === 'critical').length}
          warning={rangeAlerts.filter((a) => a.severity === 'warning').length}
          unack={rangeAlerts.filter((a) => a.status === 'sent').length}
          healthy={healthy}
          services={services.length}
          rangeLabel={
            alertsHasMore
              ? `${timeWindow.label} · latest ${alerts.length}`
              : timeWindow.label
          }
          alertFilter={alertFilter}
          issuesOnly={servicesFilter === 'issues'}
          onAlertFilter={setAlertFilter}
          onToggleIssues={() => {
            setServicesFilter((prev) => (prev === 'issues' ? null : 'issues'));
            setShowAllServices(false);
          }}
        />
      </div>
      <div className="h-90 col-span-12 xl:col-span-7 xl:h-auto xl:min-h-0">
        <RequestPerformance
          data={chartData}
          long={timeWindow.end - chartStart > 1.5 * DAY}
          note={
            tracesQuery.hasNextPage
              ? `latest ${tracesQuery.traces.length} spans`
              : undefined
          }
        />
      </div>
      <div className="flex flex-col gap-5 col-span-12 xl:col-span-5 xl:row-span-2 xl:min-h-0">
        <div className="flex h-80 flex-col xl:h-auto xl:min-h-0 xl:flex-1 xl:basis-0">
          <AlertsPreview
            alerts={shownAlerts}
            filter={alertFilter}
            onFilterChange={setAlertFilter}
            isLoading={alertsLoading}
            error={alertsError}
            currentUserId={user?.id}
            updatingId={updatingAlertId}
            onStatusChange={(id, status) => updateStatus({ id, status })}
          />
        </div>
        <div className="flex h-80 flex-col col-span-12 xl:h-auto xl:min-h-0 xl:flex-1 xl:basis-0">
          <LogsPreview
            logs={logs}
            filter={logFilter}
            onFilterChange={setLogFilter}
            isLoading={logsQuery.isLoading}
            error={logsQuery.error}
            hasMore={logsQuery.hasMore}
          />
        </div>
      </div>
      <div className="min-h-64 col-span-12 xl:col-span-7 xl:h-auto xl:min-h-0">
        <ServicesPreview
          services={services}
          filter={servicesFilter}
          onFilterChange={(next) => {
            setServicesFilter(next);
            setShowAllServices(false);
          }}
          selected={service}
          onSelect={(name) =>
            setService((prev) => (prev === name ? null : name))
          }
          showAll={showAllServices}
          onShowAll={setShowAllServices}
          isLoading={tracesQuery.isLoading || alertsLoading}
        />
      </div>
    </div>
  );
}
