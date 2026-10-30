import type { Metric } from '../../api/metricsApi';
import MetricsRow from './MetricsRow';
import { metricKey } from './metricData';

interface Data {
  metrics: Metric[];
  units: Record<string, string>;
  expanded: string[];
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onToggle: (key: string) => void;
}

const COLUMNS = ['Time', 'Service', 'Name', 'Value', ''];

export default function MetricsTable({
  metrics,
  units,
  expanded,
  isLoading,
  error,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onToggle,
}: Data) {
  return (
    <div className="overflow-x-auto border border-vigil-border">
      <table className="w-full min-w-180 border-collapse">
        <thead>
          <tr className="border-b border-vigil-border uppercase text-left text-vigil-muted text-[12px] md:text-[13px] bg-[#0D1425] tracking-wide">
            {COLUMNS.map((column, index) => (
              <th key={index} className="py-2 md:py-4 px-2 md:px-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-vigil-card">
          {isLoading && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-vigil-muted">
                Loading…
              </td>
            </tr>
          )}
          {error && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-red-400">
                {error.message}
              </td>
            </tr>
          )}
          {!isLoading && !error && metrics.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-vigil-muted">
                No metrics match these filters. Try a wider period or clear the
                service filter.
              </td>
            </tr>
          )}
          {metrics.map((metric) => {
            const key = metricKey(metric);
            return (
              <MetricsRow
                key={key}
                metric={metric}
                unit={units[metric.name] ?? ''}
                isExpanded={expanded.includes(key)}
                onToggle={() => onToggle(key)}
              />
            );
          })}
          {metrics.length > 0 && (
            <tr>
              <td colSpan={5}>
                <div className="flex justify-between items-center p-3">
                  <span className="text-vigil-muted text-[15px]">
                    {`Showing ${metrics.length} points`}
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
