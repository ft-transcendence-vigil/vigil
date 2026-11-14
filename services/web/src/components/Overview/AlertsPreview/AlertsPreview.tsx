import AlertsPreviewRow from './AlertsPreviewRow';
import type { AlertHistory, AlertStatus } from '../../../api/alertHistoryApi';
import type { AlertFilter } from '../overviewData';

const FILTERS: AlertFilter[] = ['open', 'critical', 'warning'];

const chip =
  'border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 w-15 sm:w-17 cursor-pointer transition-[color, border-color] duration-300';
const chipIdle =
  'border-vigil-border text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80]';
const chipActive = 'border-vigil-blue text-vigil-blue';

interface Data {
  alerts: AlertHistory[];
  filter: AlertFilter;
  onFilterChange: (filter: AlertFilter) => void;
  isLoading: boolean;
  error: Error | null;
  currentUserId?: string;
  updatingId?: string;
  onStatusChange: (id: string, status: AlertStatus) => void;
}

export default function AlertsPreview({
  alerts,
  filter,
  onFilterChange,
  isLoading,
  error,
  currentUserId,
  updatingId,
  onStatusChange,
}: Data) {
  return (
    <div className="flex flex-col h-full min-h-0 border border-vigil-border bg-vigil-card overflow-hidden flex-1">
      <div className="flex justify-between items-center border-b border-vigil-border px-3 sm:px-5 py-3 sticky bg-vigil-card z-39 top-0">
        <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">
          Alerts
          <span className="mono ms-2 text-[11px] text-vigil-muted-extra">
            {alerts.length}
          </span>
        </h2>
        <div className="space-x-2 print:hidden">
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
        </div>
      </div>
      <div className="overflow-y-auto scrollbar-vigil min-h-0 flex-1">
        {isLoading && <Empty>Loading alerts...</Empty>}
        {error && <Empty className="text-red-400">{error.message}</Empty>}
        {!isLoading && !error && alerts.length === 0 && (
          <Empty>Nothing matches this filter and range.</Empty>
        )}
        {alerts.map((alert) => (
          <AlertsPreviewRow
            key={alert.id}
            alert={alert}
            canAct={alert.owner_id === null || alert.owner_id === currentUserId}
            isUpdating={updatingId === alert.id}
            onStatusChange={(status) => onStatusChange(alert.id, status)}
          />
        ))}
      </div>
    </div>
  );
}

export function Empty({
  children,
  className = 'text-vigil-muted',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`mono px-4 py-7 text-center text-[12px] ${className}`}>
      {children}
    </p>
  );
}
