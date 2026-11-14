import { useMemo, useState } from 'react';
import type { Metric, Period } from '../../api/metricsApi';
import useMetrics from '../../hooks/useMetrics';
import useMetricSeries from '../../hooks/useMetricSeries';
import useLiveMetrics from '../../hooks/useLiveMetrics';
import MetricsFilters from '../../components/Metrics/MetricsFilters';
import SeriesPicker from '../../components/Metrics/SeriesPicker';
import MetricChartCard from '../../components/Metrics/MetricChartCard';
import MetricsTable from '../../components/Metrics/MetricsTable';
import { metricKey } from '../../components/Metrics/metricData';
import SectionHeader from '../../components/shared/SectionHeader';
import StateMessage from '../../components/shared/StateMessage';

const DEFAULT_SELECTION = 2;

export default function MetricsPage() {
  const [period, setPeriod] = useState<Period>('24h');
  const [service, setService] = useState('');
  const [live, setLive] = useState(false);
  //the open row is kept here and not in the url like traces because the key is long and ugly and nothing links to a metric point
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[] | null>(null);

  const {
    metrics,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    exportCsv,
    isExporting,
  } = useMetrics({ period, service });
  const { liveMetrics, isConnected, hasError } = useLiveMetrics({
    enabled: live,
    service,
  });
  const {
    groups,
    isLoading: seriesLoading,
    error: seriesError,
  } = useMetricSeries({ period, service, live });

  const rows = useMemo(() => {
    if (liveMetrics.length === 0) return metrics;
    const loaded = new Set(metrics.map(metricKey));
    return [
      ...liveMetrics.filter((m) => !loaded.has(metricKey(m))),
      ...metrics,
    ];
  }, [metrics, liveMetrics]);

  //same toggle as selectSpan in traces if we click the open row we close it if not we open the new one
  //prev is the current value of selectedKey so we compare with it and return null to close or the new key to open
  const selectMetric = (metric: Metric) => {
    const key = metricKey(metric);
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  const liveState = !live
    ? 'paused'
    : hasError
      ? 'failed'
      : isConnected
        ? 'live'
        : 'connecting';

  const selected =
    picked ?? groups.slice(0, DEFAULT_SELECTION).map((g) => g.name);
  const selectedGroups = groups.filter((g) => selected.includes(g.name));
  const chartServices = useMemo(
    () =>
      [
        ...new Set(groups.flatMap((g) => g.series.map((s) => s.service))),
      ].sort(),
    [groups],
  );
  const units = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.name, g.unit])),
    [groups],
  );
  const toggleSeries = (name: string) =>
    setPicked(
      selected.includes(name)
        ? selected.filter((n) => n !== name)
        : [...selected, name],
    );

  return (
    <div>
      <MetricsFilters
        period={period}
        service={service}
        live={live}
        liveState={liveState}
        isExporting={isExporting}
        onPeriodChange={setPeriod}
        onServiceChange={setService}
        onLiveChange={() => setLive((prev) => !prev)}
        onExport={() => exportCsv()}
      />

      <section className="space-y-4 mb-9">
        <SectionHeader
          title="Series"
          caption={
            service
              ? `${service}, averaged per time bucket`
              : 'Every service, averaged per time bucket'
          }
        />
        {seriesLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 2 }, (_, i) => (
              <div
                key={i}
                className="h-72 bg-vigil-panel border border-vigil-border animate-pulse"
              />
            ))}
          </div>
        )}
        {seriesError && <StateMessage text={seriesError.message} isError />}
        {!seriesLoading && !seriesError && (
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

      <MetricsTable
        metrics={rows}
        units={units}
        selectedKey={selectedKey}
        isLoading={isLoading}
        error={error}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        onSelect={selectMetric}
      />
    </div>
  );
}
