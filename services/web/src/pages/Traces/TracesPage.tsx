
//hooks
import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Period, Trace } from '../../api/tracesApi';
//costume hooks
import useTraces from '../../hooks/useTraces';
import useLiveTraces from '../../hooks/useLiveTraces';
//components
import TracesFilters from '../../components/Traces/TracesFilters';
import TracesTable from '../../components/Traces/TracesTable';

export default function TracesPage() {
  //setPeriod function that changes the value period this use state takes only Period as value . inital value is 1h
  //the hook usestate remembers values during react re-render only changes when u call the setter
  //setters like setPeriod save the new value and re render the page
  //a hook from React Router. It reads the query string of the current url, and re renders the page when it changes
  //searchParams object have  query string. read it with .get('key')
  //setSearchParams	func writes a new query string into url<
  //its above the usestates because service starts from the url
  const [searchParams, setSearchParams] = useSearchParams();
  const [period, setPeriod] = useState<Period>('1h');
  //links like /traces?service=api open already filtered, only read once on the first render
  const [service, setService] = useState(searchParams.get('service') ?? '');
  const [live, setLive] = useState(false);
  //we get the trace id and span id
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
    //no live traces return regular traces
    if (liveTraces.length === 0) return traces;
    //we get traces id and store them in a set
    const loaded = new Set(traces.map((t) => t.span_id));
    //combine livetraces with traces into a array and return them
    return [...liveTraces.filter((t) => !loaded.has(t.span_id)), ...traces];
  }, [traces, liveTraces]);
//selectedTraceId its in the url? is selectedSpanId in the url? make it the vlaue if not  make it selectedTraceId if not null
//reads from url
  const selectedSpan = selectedTraceId 
    ? (rows.find((t) => t.span_id === selectedSpanId) ??
      rows.find((t) => t.trace_id === selectedTraceId) ??
      null)
    : null;
//write into the url
  const selectSpan = (trace: Trace) =>
    trace.span_id === selectedSpan?.span_id
      ? closeDrawer()
      : setSearchParams(
          //prev is the current query string, we copy it and only set our two keys so ?service= stays
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('trace_id', trace.trace_id);
            next.set('span_id', trace.span_id);
            return next;
          },
          //replace the current history entry instead of adding a new one
          { replace: true },
        );
    //when closing the open row remove only trace_id and span_id, other params like service stay in the url
    //useCallback gives u the same func on every render because nothing changes here we dont want to give a new func each time
    //it takes the function to keep and a dependcies if it changes we give a new function
  const closeDrawer = useCallback(
    () =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('trace_id');
          next.delete('span_id');
          return next;
        },
        { replace: true },
      ),
    [setSearchParams],
  );
//simple check of the live state
  const liveState = !live
    ? 'paused'
    : hasError
      ? 'failed'
      : isConnected
        ? 'live'
        : 'connecting';

  return (
    //stack children virtically give 20px gap. between them and take full hight of the page
    <div>
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
    </div>
  );
}
