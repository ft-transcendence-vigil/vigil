import type { Metric } from '../../api/metricsApi';
import { formatTime, timeAgo } from '../shared/utils/format';
import { formatMetricValue } from './metricData';
import MetricDetails from './MetricDetails';

type Data = {
  metric: Metric;
  unit: string;
  isSelected: boolean;
  onSelect: () => void;
};

export default function MetricsRow({
  metric,
  unit,
  isSelected,
  onSelect,
}: Data) {
  return (
    <>
      <tr
        onClick={onSelect}
        className={`border-b border-vigil-border hover:bg-[#0C1424] transition-colors duration-200 cursor-pointer relative after:absolute after:right-5 after:top-1/2 after:-translate-y-1/2 ${isSelected ? "after:content-['▴']" : "after:content-['▾']"} text-[12px] text-vigil-muted`}
      >
        <td
          title={formatTime(metric.timestamp)}
          className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3 whitespace-nowrap"
        >
          {timeAgo(metric.timestamp)}
        </td>
        <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3 truncate max-w-40">
          {metric.service}
        </td>
        <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3 truncate max-w-72">
          {metric.name}
        </td>
        <td className="text-[13px] py-1 md:py-3 px-2 md:px-3 pe-12 mono whitespace-nowrap">
          {metric.value === null ? '—' : formatMetricValue(metric.value, unit)}
        </td>
      </tr>
      {isSelected && (
        <tr>
          <td colSpan={4}>
            <MetricDetails metric={metric} />
          </td>
        </tr>
      )}
    </>
  );
}
