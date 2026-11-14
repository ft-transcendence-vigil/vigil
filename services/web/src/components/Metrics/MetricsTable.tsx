import type { Metric } from '../../api/metricsApi';
import MetricsRow from './MetricsRow';
import { metricKey } from './metricData';

interface Data {
  metrics: Metric[];
  units: Record<string, string>;
  selectedKey: string | null;
  isLoading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelect: (metric: Metric) => void;
}

const COLUMNS = ['Time', 'Service', 'Name', 'Value'];

export default function MetricsTable({
  metrics,
  units,
  selectedKey,
  isLoading,
  error,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelect,
}: Data) {
  return (
    // lets the table scroll horizontally on small screens
    //table scroll sideways on mobile and make table tke full box
    //thead headof the table 
    //tr rows one line border loop over column it has all the headers and show them add paddings it draws the headers the 4 headers not the metrics
    <div className="overflow-x-auto">
      <table className="w-full min-w-180 border-collapse border border-vigil-border">
        <thead>
          <tr className="border-b border-vigil-border uppercase text-left text-vigil-muted text-[12px] md:text-[13px] bg-vigil-panel tracking-wide">
            {COLUMNS.map((column, index) => (
              <th key={index} className="py-2 md:py-4 px-2 md:px-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-vigil-card">
          {/* if its loading collapse the 4 collumns into one and write loading */}
          {isLoading && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-vigil-muted">
                Loading…
              </td>
            </tr>
          )}
          {/* same as isloading but for error */}
          {error && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-vigil-state-danger-text">
                {error.message}
              </td>
            </tr>
          )}
          {/* if not loading and no errror and no metrics  */}
          {!isLoading && !error && metrics.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-vigil-muted">
                No metrics match these filters. Try a wider period or clear the
                service filter.
              </td>
            </tr>
          )}
          {/* we draw the actual metrics  MetricsRow component that take these props key is tell react to compare it between renders in stead of comparing the position of the rows because they dont change*/}
          {metrics.map((metric) => {
            const key = metricKey(metric);
            return (
              <MetricsRow
                key={key}
                metric={metric}
                unit={units[metric.name] ?? ''}
                //the row is open when its key is the one we saved in the page
                isSelected={key === selectedKey}
                onSelect={() => onSelect(metric)}
              />
            );
          })}
          {metrics.length > 0 && (
            <tr>
              {/* the footer collapes the rows print how much points are shown if there is  next page  type load more if not show end result */}
              <td colSpan={4}>
                <div className="flex justify-between items-center p-3">
                  <span className="text-vigil-muted text-[15px]">
                    {`Showing ${metrics.length} points`}
                  </span>
                  {hasNextPage ? (
                    <button
                      type="button"
                      onClick={onLoadMore}
                      //disable button when its fetching points
                      disabled={isFetchingNextPage}
                      className="text-[12px] md:text-[13px] cursor-pointer border border-vigil-border px-4 h-9 text-vigil-muted hover:border-vigil-text/60 hover:text-vigil-text/60 transition-[color,border-color] duration-200"
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
