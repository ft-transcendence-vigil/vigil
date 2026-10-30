import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Period, Trace } from '../../api/tracesApi';
import useTraces from '../../hooks/useTraces';
import useLiveTraces from '../../hooks/useLiveTraces';
import TracesFilters from '../../components/Traces/TracesFilters';
import TracesTable from '../../components/Traces/TracesTable';
import TraceDrawer from '../../components/Traces/TraceDrawer';

export default function TracesPage() {
  const [period, setPeriod] = useState<Period>('1h');
  const [service, setService] = useState('');
  const [live, setLive] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTraceId = searchParams.get('trace_id');
  const selectedSpanId = searchParams.get('span_id');

  const {
    traces,
    isLoading,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    exportCsv,
    isExporting,
  } = useTraces({ period, service });
  const { liveTraces, isConnected, hasError } = useLiveTraces({
    enabled: live,
    service,
  });

  const rows = useMemo(() => {
    if (liveTraces.length === 0) return traces;
    const loaded = new Set(traces.map((t) => t.span_id));
    return [...liveTraces.filter((t) => !loaded.has(t.span_id)), ...traces];
  }, [traces, liveTraces]);

  const selectedSpan = selectedTraceId
    ? (rows.find((t) => t.span_id === selectedSpanId) ??
      rows.find((t) => t.trace_id === selectedTraceId) ??
      null)
    : null;

  const selectSpan = (trace: Trace) =>
    setSearchParams(
      { trace_id: trace.trace_id, span_id: trace.span_id },
      { replace: true },
    );
  const closeDrawer = useCallback(
    () => setSearchParams({}, { replace: true }),
    [setSearchParams],
  );

  const liveState = !live
    ? 'paused'
    : hasError
      ? 'failed'
      : isConnected
        ? 'live'
        : 'connecting';

  return (
    <div className="flex flex-col gap-5 xl:h-full xl:min-h-0">
      <TracesFilters
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
      <TracesTable
        traces={rows}
        selectedSpanId={selectedSpan?.span_id ?? null}
        isLoading={isLoading}
        error={error}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        onSelect={selectSpan}
      />
      {selectedTraceId && (
        <TraceDrawer
          traceId={selectedTraceId}
          span={selectedSpan}
          onClose={closeDrawer}
        />
      )}
    </div>
  );
}
