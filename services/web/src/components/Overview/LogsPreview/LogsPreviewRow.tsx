type AlertSeverity = 'error' | 'warn' | 'info';

export interface Data {
  date: string;
  severity: AlertSeverity;
  title: string;
  threshold: string;
  className: string;
}

export default function LogsPreviewRow({
  date,
  severity,
  title,
  threshold,
  className,
}: Data) {
  return (
    <div className="flex items-center border-b border-b-vigil-border px-3 sm:px-5 py-3 mono hover:bg-[rgba(99,179,237,.03)] transition-[background-color] duration-300">
      <div className="text-[11px] me-4 text-vigil-muted-extra">{date}</div>
      <div className="flex items-center">
        <div
          className={`text-[10px] tracking-widest uppercase py-0.5 w-15 text-center me-3 ${className}`}
        >
          {severity}
        </div>
        <div>
          <div className="text-[12px] mb-0.5">{title}</div>
          <div className="text-[11px] text-vigil-muted-extra">{threshold}</div>
        </div>
      </div>
    </div>
  );
}
