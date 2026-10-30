import type { Metric } from '../../api/metricsApi';
import { timeAgo } from '../shared/utils/format';

interface Data {
  metric: Metric;
}

function formatValue(value: number | null): string {
  if (value === null) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function InfraMetricCard({ metric }: Data) {
  return (
    <div className="kpi-card border border-vigil-border p-4">
      <div
        title={metric.name}
        className="text-[12px] uppercase tracking-wider text-vigil-muted truncate"
      >
        {metric.name}
      </div>
      <div className="space text-[34px] my-3">{formatValue(metric.value)}</div>
      <div className="flex justify-between gap-2 text-[11px] text-vigil-muted-extra">
        <span className="truncate">{metric.service}</span>
        <span className="shrink-0">{timeAgo(metric.timestamp)}</span>
      </div>
    </div>
  );
}
