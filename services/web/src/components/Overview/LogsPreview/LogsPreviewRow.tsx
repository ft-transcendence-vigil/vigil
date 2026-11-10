import type { Log } from '../../../api/logsApi';
import { OTHER_CLASS, SEVERITY_CLASS, formatLogTime } from '../overviewData';

export default function LogsPreviewRow({ log }: { log: Log }) {
  return (
    <div className="flex items-center border-b border-b-vigil-border px-3 sm:px-5 py-3 mono hover:bg-[rgba(99,179,237,.03)] transition-[background-color] duration-300">
      <div
        className="shrink-0 text-[11px] me-4 text-vigil-muted-extra"
        title={new Date(log.timestamp).toLocaleString()}
      >
        {formatLogTime(log.timestamp)}
      </div>
      <div className="flex items-center min-w-0">
        <div
          className={`shrink-0 text-[10px] tracking-widest uppercase py-0.5 w-15 text-center me-3 ${SEVERITY_CLASS[log.severity] ?? OTHER_CLASS}`}
        >
          {log.severity === 'warning' ? 'warn' : log.severity}
        </div>
        <div className="min-w-0">
          <div className="text-[12px] mb-0.5 truncate">{log.message}</div>
          <div className="text-[11px] text-vigil-muted-extra">
            {log.service}
          </div>
        </div>
      </div>
    </div>
  );
}
