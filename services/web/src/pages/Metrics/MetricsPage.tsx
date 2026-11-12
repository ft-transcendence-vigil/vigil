//hooks
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Metric, Period } from '../../api/metricsApi';
//costume hooks
import useMetrics from '../../hooks/useMetrics';
import useMetricSeries from '../../hooks/useMetricSeries';
import useLiveMetrics from '../../hooks/useLiveMetrics';
//components
import MetricsFilters from '../../components/Metrics/MetricsFilters';
import SeriesPicker from '../../components/Metrics/SeriesPicker';
import MetricChartCard from '../../components/Metrics/MetricChartCard';
import MetricsTable from '../../components/Metrics/MetricsTable';
import { metricKey } from '../../components/Metrics/metricData';
import SectionHeader from '../../components/shared/SectionHeader';
import StateMessage from '../../components/shared/StateMessage';

const DEFAULT_SELECTION = 2;

export default function MetricsPage() {
  //setPeriod function that changes the value period this use state takes only Period as value . inital value is 24h
  //the hook usestate remembers values during react re-render only changes when u call the setter
  //setters like setPeriod save the new value and re render the page
  //a hook from React Router. It reads the query string of the current url, and re renders the page when it changes
  //searchParams object have  query string. read it with .get('key')
  //its above the usestates because service starts from the url
  const [searchParams] = useSearchParams();
  const [period, setPeriod] = useState<Period>('24h');
  //links like /metrics?service=api open already filtered, only read once on the first render
  const [service, setService] = useState(searchParams.get('service') ?? '');
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
    //no live metrics return regular metrics
    if (liveMetrics.length === 0) return metrics;
    //we get metrics keys and store them in a set
    const loaded = new Set(metrics.map(metricKey));
    //combine livemetrics with metrics into a array and return them
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

  //simple check of the live state
  const liveState = !live
    ? 'paused'
    : hasError
      ? 'failed'
      : isConnected
        ? 'live'
        : 'connecting';

  const selected =
  //if picked has groups other wise take 2 series from groups with slicing groups and loop to get their name
    picked ?? groups.slice(0, DEFAULT_SELECTION).map((g) => g.name);
  //loop through groups and selected only the ones in selected
  //filter go through groups keep ones the function returns true
  const selectedGroups = groups.filter((g) => selected.includes(g.name));
  const chartServices = useMemo(
    () =>
      [
        //loop through groups and make an array of all services names  sort them by name
        //flatmap unpacks everything in on list and map just depends on what u give it 
        ...new Set(groups.flatMap((g) => g.series.map((s) => s.service))),
      ].sort(),
    [groups],
  );
//raw points dont include their unit, so we build a name → unit dictionary from the series
//the table uses it to show values like 132ms or 42.1% instead of plain numbers
//Object.fromEntries turn dict into an js object 
  const units = useMemo(
    () => Object.fromEntries(groups.map((g) => [g.name, g.unit])),
    [groups],
  );
  //when you click a metric button remove that metric if it’s already charted else add it and  save the new list in picked
  const toggleSeries = (name: string) =>
    //is name we clicked on selected if yes filter it from selected if no add it to selected
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
            {/* if series loading draw two empty boxes */}
            {Array.from({ length: 2 }, (_, i) => (
              <div
                key={i}
                className="h-72 bg-[#0D1425] border border-vigil-border animate-pulse"
              />
            ))}
          </div>
        )}
        {/* if error show error msg */}
        {seriesError && <StateMessage text={seriesError.message} isError />}
        {!seriesLoading && !seriesError && (
          <>
            {groups.length === 0 ? (
              <StateMessage text="No metrics recorded in this period." />
            ) : (
              //draw buttons
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
