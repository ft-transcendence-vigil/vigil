import { useMemo, useState } from 'react';
import type { Period } from '../../api/metricsApi';
import useMetrics from '../../hooks/useMetrics';
import useMetricSeries from '../../hooks/useMetricSeries';
import useLiveMetrics from '../../hooks/useLiveMetrics';
import MetricsFilters from '../../components/Metrics/MetricsFilters';
import SeriesPicker from '../../components/Metrics/SeriesPicker';
import MetricChartCard from '../../components/Metrics/MetricChartCard';
import MetricsTable from '../../components/Metrics/MetricsTable';
import { isInternal, metricKey } from '../../components/Metrics/metricData';
import SectionHeader from '../../components/shared/SectionHeader';
import StateMessage from '../../components/shared/StateMessage';

const DEFAULT_SELECTION = 2;

export default function MetricsPage() {
  const [period, setPeriod] = useState<Period>('24h');
  const [service, setService] = useState('');
  const [showInternal, setShowInternal] = useState(false);
  const [live, setLive] = useState(false);
  const [picked, setPicked] = useState<string[] | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);

  const {
    groups,
    isLoading: seriesLoading,
    error: seriesError,
    isUnavailable,
  } = useMetricSeries({ period, service, showInternal, live });
  const {
    metrics,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    exportCsv,
    isExporting,
  } = useMetrics({ period, service, showInternal });
  const { liveMetrics, isConnected, hasError } = useLiveMetrics({
    enabled: live,
    service,
  });

  // Until the user picks, show the first few non-internal metrics.
  const selected =
    picked ??
    groups
      .filter((g) => !g.internal)
      .slice(0, DEFAULT_SELECTION)
      .map((g) => g.name);
  const selectedGroups = groups.filter((g) => selected.includes(g.name));

  const chartServices = useMemo(
    () =>
      [
        ...new Set(groups.flatMap((g) => g.series.map((s) => s.service))),
      ].sort(),
    [groups],
  );
  const allServices = useMemo(
    () =>
      [...new Set([...chartServices, ...metrics.map((m) => m.service)])].sort(),
    [chartServices, metrics],
  );
  const units = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.name, g.unit])),
    [groups],
  );

  const rows = useMemo(() => {
    const liveRows = showInternal
      ? liveMetrics
      : liveMetrics.filter((m) => !isInternal(m));
    const seen = new Set<string>();
    return [...liveRows, ...metrics].filter((m) => {
      const key = metricKey(m);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [liveMetrics, metrics, showInternal]);

  const toggleSeries = (name: string) =>
    setPicked(
      selected.includes(name)
        ? selected.filter((n) => n !== name)
        : [...selected, name],
    );
  const toggleRow = (key: string) =>
    setExpanded((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const liveState = !live
    ? 'paused'
    : hasError
      ? 'failed'
      : isConnected
        ? 'live'
        : 'connecting';

  return (
    <div className="space-y-6 xl:h-full xl:overflow-y-auto xl:pe-2">
      <MetricsFilters
        period={period}
        service={service}
        services={allServices}
        showInternal={showInternal}
        live={live}
        liveState={liveState}
        isExporting={isExporting}
        onPeriodChange={setPeriod}
        onServiceChange={setService}
        onShowInternalChange={setShowInternal}
        onLiveChange={() => setLive((prev) => !prev)}
        onExport={() => exportCsv()}
      />

      <section className="space-y-4">
        <SectionHeader
          title="Series"
          caption={
            service
              ? `${service}, averaged per time bucket`
              : 'Every service, averaged per time bucket'
          }
        />
        {isUnavailable && (
          <StateMessage text="Charts need the /api/telemetry/metrics/series endpoint, which the backend doesn't have yet. The raw points below are real data." />
        )}
        {seriesLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 2 }, (_, i) => (
              <div
                key={i}
                className="h-72 bg-[#0D1425] border border-vigil-border animate-pulse"
              />
            ))}
          </div>
        )}
        {seriesError && <StateMessage text={seriesError.message} isError />}
        {!seriesLoading && !seriesError && !isUnavailable && (
          <>
            {groups.length === 0 ? (
              <StateMessage text="No metrics recorded in this period." />
            ) : (
              <SeriesPicker
                groups={groups}
                selected={selected}
                onToggle={toggleSeries}
              />
            )}
            {groups.length > 0 && selectedGroups.length === 0 && (
              <StateMessage text="Select a metric above to plot it." />
            )}
            {selectedGroups.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {selectedGroups.map((group) => (
                  <MetricChartCard
                    key={group.name}
                    group={group}
                    services={chartServices}
                    period={period}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <SectionHeader title="Raw points" caption="Newest first" />
        <MetricsTable
          metrics={rows}
          units={units}
          expanded={expanded}
          isLoading={isLoading}
          error={error}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
          onToggle={toggleRow}
        />
      </section>
    </div>
  );
}
