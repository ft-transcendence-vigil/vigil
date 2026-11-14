import { Link } from 'react-router-dom';
import LogsPreviewRow from './LogsPreviewRow';
import type { Log } from '../../../api/logsApi';
import type { LogFilter } from '../overviewData';
import { Empty } from '../AlertsPreview/AlertsPreview';

const FILTERS: LogFilter[] = ['issues', 'all'];

const chip =
  'border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 w-15 sm:w-17 cursor-pointer transition-[color, border-color] duration-300';
const chipIdle =
  'border-vigil-border text-vigil-muted hover:text-vigil-text-hover hover:border-vigil-border-hover';
const chipActive = 'border-vigil-accent text-vigil-accent';

interface Data {
  logs: Log[];
  filter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
}

export default function LogsPreview({
  logs,
  filter,
  onFilterChange,
  isLoading,
  error,
  hasMore,
}: Data) {
  return (
    <div className="flex flex-col h-full min-h-0 border border-vigil-border bg-vigil-card overflow-hidden">
      <div className="flex justify-between items-center border-b border-vigil-border px-3 sm:px-5 py-3.5 sticky bg-vigil-card z-39 top-0">
        <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">
          Logs
          <span className="mono ms-2 text-[11px] text-vigil-muted-extra">
            {logs.length}
            {hasMore && '+'}
          </span>
        </h2>
        <div className="flex space-x-2 print:hidden">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => onFilterChange(f)}
              className={`${chip} ${filter === f ? chipActive : chipIdle}`}
            >
              {f}
            </button>
          ))}
          <Link
            to="/logs"
            className={`${chip} ${chipIdle} flex items-center justify-center`}
          >
            view →
          </Link>
        </div>
      </div>
      <div className="overflow-y-auto scrollbar-vigil min-h-0 flex-1">
        {isLoading && <Empty>Loading logs...</Empty>}
        {error && <Empty className="text-vigil-state-danger-text">{error.message}</Empty>}
        {!isLoading && !error && logs.length === 0 && (
          <Empty>No matching logs in this range.</Empty>
        )}
        {logs.map((log, i) => (
          <LogsPreviewRow key={`${log.timestamp}-${i}`} log={log} />
        ))}
        {hasMore && logs.length > 0 && (
          <Empty className="text-vigil-muted-extra">
            Showing the latest {logs.length} · export CSV for all
          </Empty>
        )}
      </div>
    </div>
  );
}
