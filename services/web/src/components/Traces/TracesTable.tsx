import type { Trace } from '../../api/tracesApi';
import TracesRow from './TracesRow';

interface Data {
  traces: Trace[];
  selectedSpanId: string | null;
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelect: (trace: Trace) => void;
}

const COLUMNS = ['Time', 'Service', 'Span', 'Duration', 'Status', 'Trace ID'];

export default function TracesTable({
  traces,
  selectedSpanId,
  isLoading,
  error,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelect,
}: Data) {
  const maxDuration = Math.max(1, ...traces.map((t) => t.duration_ms));

  return (
    <div className="overflow-auto min-h-0 flex-1 border border-vigil-border">
      <table className="w-full min-w-200 border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-vigil-border uppercase text-left text-vigil-muted text-[12px] md:text-[13px] bg-[#0D1425] tracking-wide">
            {COLUMNS.map((column) => (
              <th key={column} className="py-2 md:py-4 px-2 md:px-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-vigil-card">
          {isLoading && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-vigil-muted">
                Loading…
              </td>
            </tr>
          )}
          {error && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-red-400">
                {error.message}
              </td>
            </tr>
          )}
          {!isLoading && !error && traces.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-vigil-muted">
                No traces match these filters. Try a wider period or clear the
                service filter.
              </td>
            </tr>
          )}
          {traces.map((trace) => (
            <TracesRow
              key={trace.span_id}
              trace={trace}
              maxDuration={maxDuration}
              isSelected={trace.span_id === selectedSpanId}
              onSelect={() => onSelect(trace)}
            />
          ))}
          {traces.length > 0 && (
            <tr>
              <td colSpan={6}>
                <div className="flex justify-between items-center p-3">
                  <span className="text-vigil-muted text-[15px]">
                    {`Showing ${traces.length} spans`}
                  </span>
                  {hasNextPage ? (
                    <button
                      type="button"
                      onClick={onLoadMore}
                      disabled={isFetchingNextPage}
                      className="text-[12px] md:text-[13px] cursor-pointer border border-vigil-border px-4 h-9 text-vigil-muted hover:border-white/60 hover:text-white/60 transition-[color,border-color] duration-200"
                    >
                      {isFetchingNextPage ? 'Loading…' : 'Load more'}
                    </button>
                  ) : (
                    <span className="text-vigil-muted-extra text-[13px]">
                      End of results
                    </span>
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
