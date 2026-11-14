import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'sonner';
import type { Trace } from '../../api/tracesApi';
import { formatDuration, formatTime, timeAgo } from '../shared/utils/format';
import { durationColor, statusColors } from './traceColors';
import TraceDetails from './TraceDetails';

type Data = {
  trace: Trace;
  maxDuration: number;
  isSelected: boolean;
  onSelect: () => void;
};
//we call this function in the icon element
export default function TracesRow({
  trace,
  maxDuration,
  isSelected,
  onSelect,
}: Data) {
  //e: React.MouseEvent click even 
  const copyTraceId = (e: React.MouseEvent) => {
  //e.stopPropagation() stop the click from going to the parent so it doesnt open the drawer and only copies the id
    e.stopPropagation();
  //browser func to copy write trace.trace_id to clipboard then on sucess do a success popup same for error
    navigator.clipboard
      .writeText(trace.trace_id)
      .then(() => toast.success('Trace ID copied'))
      .catch(() => toast.error('Unable to copy trace ID'));
  };

  return (
    //on select when clicking add the queryto the url which triggers the drawers
    <>
    <tr
      onClick={onSelect}
      className={`border-b border-vigil-border hover:bg-vigil-row-hover transition-colors duration-200 cursor-pointer relative after:absolute after:right-5 after:top-1/2 after:-translate-y-1/2 ${isSelected ? "after:content-['▴']" : "after:content-['▾']"} text-[12px] text-vigil-muted`}
    >
      <td
      //title shows the full date
        title={formatTime(trace.timestamp)}
        className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3 whitespace-nowrap"
      >
      {/* when the trace happened  */}
        {timeAgo(trace.timestamp)}
      </td>
      {/* service and name */}
      <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3 truncate max-w-40">
        {trace.service}
      </td>
      <td className="text-[14px] md:text-[16px] py-1 md:py-3 px-2 md:px-3 truncate max-w-60">
        {trace.name}
      </td>
      <td className="text-[13px] py-1 md:py-3 px-2 md:px-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-11 bg-vigil-panel">
            {/* duration of the bar yellow or red or green and duration width based on max duration then write duration of the trace  */}
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
      {/* stattus color and status  */}
      <td className="text-[13px] py-1 md:py-3 px-2 md:px-3">
        <span className={`px-2 py-1 mono ${statusColors[trace.status]}`}>
          {trace.status}
        </span>
      </td>
      {/* icon to copy */}
      <td className="text-[13px] py-1 md:py-3 px-2 md:px-3 pe-12 mono">
        <button
          type="button"
          title="Copy trace ID"
          onClick={copyTraceId}
          className="me-2 cursor-pointer hover:text-vigil-accent transition-colors duration-200"
        >
          {/* copy icon */}
          <FontAwesomeIcon icon={faCopy} />
        </button>
        {/* show only 10 char from id then ...*/}
        {trace.trace_id.slice(0, 10)}…
      </td>
    </tr>
    {/*if selected we show trace details*/}
    {isSelected && (
      <tr>
        <td colSpan={6}>
          <TraceDetails span={trace} />
        </td>
      </tr>
    )}
    </>
  );
}
