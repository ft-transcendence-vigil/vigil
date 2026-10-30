import type { Metric } from '../../api/metricsApi';
import { formatTime, timeAgo } from '../shared/utils/format';
import { formatMetricValue, isInternal } from './metricData';

type Data = {
  metric: Metric;
  unit: string;
  isExpanded: boolean;
  onToggle: () => void;
};

export default function MetricsRow({
  metric,
  unit,
  isExpanded,
  onToggle,
}: Data) {
  const attributes = Object.entries(metric.attributes);

  return (
    <>
      <tr
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={`border-b border-vigil-border cursor-pointer transition-colors duration-200 ${
          isExpanded
            ? 'bg-[#2195f317] shadow-[inset_2px_0_0_var(--color-vigil-blue)]'
            : 'hover:bg-[#0C1424]'
        }`}
      >
        <td
          title={formatTime(metric.timestamp)}
          className="text-[13px] py-2 md:py-3 px-2 md:px-3 text-vigil-muted whitespace-nowrap"
        >
          {timeAgo(metric.timestamp)}
        </td>
        <td className="text-[14px] py-2 md:py-3 px-2 md:px-3 truncate max-w-40">
          {metric.service}
        </td>
        <td className="text-[14px] py-2 md:py-3 px-2 md:px-3 mono text-vigil-blue truncate max-w-72">
          {metric.name}
          {isInternal(metric) && (
            <span className="ms-2 text-[10px] text-[#f59e0b] border border-[#f59e0b]/30 px-1.5">
              internal
            </span>
          )}
        </td>
        <td className="text-[13px] py-2 md:py-3 px-2 md:px-3 mono whitespace-nowrap">
          {metric.value === null ? '—' : formatMetricValue(metric.value, unit)}
        </td>
        <td className="text-[12px] py-2 md:py-3 px-2 md:px-3 text-vigil-muted text-right whitespace-nowrap">
          {isExpanded ? 'hide ▴' : 'details ▾'}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-b border-vigil-border bg-vigil-bg">
          <td colSpan={5} className="px-3 py-3">
            <div className="text-[11px] text-vigil-muted uppercase tracking-wider mb-2">
              Attributes
            </div>
            {attributes.length === 0 ? (
              <span className="text-[13px] text-vigil-muted-extra">
                No attributes
              </span>
            ) : (
              <dl className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-4 gap-y-1 mono text-[12px]">
                {attributes.map(([key, value]) => (
                  <div key={key} className="flex gap-2 min-w-0">
                    <dt className="text-vigil-muted shrink-0">{key}:</dt>
                    <dd className="break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
