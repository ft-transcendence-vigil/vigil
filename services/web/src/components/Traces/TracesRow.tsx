import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import type { Trace } from '../../api/tracesApi';
import { formatDuration, formatTime, timeAgo } from '../shared/utils/format';
import { durationColor, statusColors } from './traceColors';

type Data = {
  trace: Trace;
  maxDuration: number;
  isSelected: boolean;
  onSelect: () => void;
};

export default function TracesRow({
  trace,
  maxDuration,
  isSelected,
  onSelect,
}: Data) {
  const copyTraceId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard
      .writeText(trace.trace_id)
      .then(() => toast.success('Trace ID copied'))
      .catch(() => toast.error('Unable to copy trace ID'));
  };

  return (
    <tr
      onClick={onSelect}
      className={`border-b border-vigil-border cursor-pointer transition-colors duration-200 ${
        isSelected
          ? 'bg-[#2195f317] shadow-[inset_2px_0_0_var(--color-vigil-blue)]'
          : 'hover:bg-[#0C1424]'
      }`}
    >
      <td
        title={formatTime(trace.timestamp)}
        className="text-[13px] py-2 md:py-3 px-2 md:px-3 text-vigil-muted whitespace-nowrap"
      >
        {timeAgo(trace.timestamp)}
      </td>
      <td className="text-[14px] py-2 md:py-3 px-2 md:px-3 truncate max-w-40">
        {trace.service}
      </td>
      <td className="text-[14px] py-2 md:py-3 px-2 md:px-3 mono truncate max-w-60">
        {trace.name}
      </td>
      <td className="text-[13px] py-2 md:py-3 px-2 md:px-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-11 bg-[#0D1425]">
            <div
              className={`h-full ${durationColor(trace.duration_ms)}`}
              style={{
                width: `${Math.max(4, (trace.duration_ms / maxDuration) * 100)}%`,
              }}
            />
          </div>
          <span className="mono text-vigil-muted whitespace-nowrap">
            {formatDuration(trace.duration_ms)}
          </span>
        </div>
      </td>
      <td className="text-[13px] py-2 md:py-3 px-2 md:px-3">
        <span className={`px-2 py-1 mono ${statusColors[trace.status]}`}>
          {trace.status}
        </span>
      </td>
      <td className="text-[13px] py-2 md:py-3 px-2 md:px-3 mono text-vigil-muted">
        <button
          type="button"
          title="Copy trace ID"
          onClick={copyTraceId}
          className="me-2 cursor-pointer hover:text-vigil-blue transition-colors duration-200"
        >
          <FontAwesomeIcon icon={faCopy} />
        </button>
        {trace.trace_id.slice(0, 10)}…
      </td>
    </tr>
  );
}
