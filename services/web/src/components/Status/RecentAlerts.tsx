import type { Alert } from '../../api/alertsApi';
import { colors } from '../AlertRules/colorsGuid';
import { formatTime, timeAgo } from '../shared/utils/format';

interface Data {
  alerts: Alert[];
  isLoading: boolean;
  error: Error | null;
}

function describe(alert: Alert): string {
  if (alert.threshold === null) return 'Service stopped sending telemetry';
  const metric = alert.aggregation
    ? `${alert.aggregation}(${alert.metric_name})`
    : alert.metric_name;
  return `${metric} reached ${alert.threshold} over ${alert.window_seconds}s`;
}

export default function RecentAlerts({ alerts, isLoading, error }: Data) {
  return (
    <div className="border border-vigil-border bg-vigil-card mono">
      {isLoading && (
        <p className="py-6 text-center text-[13px] text-vigil-muted">
          Loading…
        </p>
      )}
      {error && (
        <p className="py-6 text-center text-[13px] text-red-400">
          {error.message}
        </p>
      )}
      {!isLoading && !error && alerts.length === 0 && (
        <p className="py-6 text-center text-[13px] text-vigil-muted">
          No alerts in the last 24 hours.
        </p>
      )}
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="grid grid-cols-[1fr_auto] md:grid-cols-[90px_160px_1fr_auto_auto] gap-x-4 gap-y-1 items-center border-b border-vigil-border last:border-b-0 px-3 sm:px-5 py-3 text-[12px]"
        >
          <span
            title={formatTime(alert.triggered_at)}
            className="text-vigil-muted-extra"
          >
            {timeAgo(alert.triggered_at)}
          </span>
          <span className="truncate md:order-none order-first">
            {alert.service}
          </span>
          <span className="text-vigil-muted truncate col-span-2 md:col-span-1">
            {describe(alert)}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-vigil-muted-extra">
            {alert.status}
          </span>
          <span
            className={`text-[10px] uppercase tracking-widest px-2 py-0.5 text-center ${colors[alert.severity]}`}
          >
            {alert.severity}
          </span>
        </div>
      ))}
    </div>
  );
}
