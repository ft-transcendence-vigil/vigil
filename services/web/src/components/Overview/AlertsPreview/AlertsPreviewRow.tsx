import { useState } from 'react';

type AlertSeverity = 'critical' | 'warning';
type AlertAction = 'ack' | 'resolve';

export interface Data {
  severity: AlertSeverity;
  title: string;
  threshold: string;
  date: string;
  action: AlertAction;
  llmAnalysis: string;
  className: string;
}

export default function AlertsPreviewRow({
  severity,
  title,
  threshold,
  date,
  action,
  llmAnalysis,
  className,
}: Data) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="alert-preview-row">
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex justify-between items-center border-b border-b-vigil-border px-3 sm:px-5 py-3 mono hover:bg-[rgba(99,179,237,.03)] transition-[background-color] duration-300 cursor-pointer"
      >
        <div className="flex items-center">
          <div
            className={`text-[8px] sm:text-[10px] tracking-widest uppercase py-0.5 w-15 sm:w-16.5 text-center me-3 ${className}`}
          >
            {severity}
          </div>
          <div>
            <div className="text-[12px] mb-0.5">{title}</div>
            <div className="xs:text-[9px] text-[11px] text-vigil-muted-extra">
              {threshold}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end">
          <span className="text-[8.5px] sm:text-[10px] me-2 sm:me-3 text-vigil-muted-extra">
            {date}
          </span>
          <button
            onClick={(e: React.MouseEvent<HTMLElement>) => {
              const target = e.target as HTMLElement;
              target.parentElement?.parentElement?.parentElement?.remove();
            }}
            className="border border-vigil-border uppercase text-[9px] sm:text-[10px] tracking-wider h-7 sm:h-8 w-14 sm:w-16 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300"
          >
            {action}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="px-5 py-3 mono bg-[#0D1425]">
          <p className="text-[11px] tracking-wide text-vigil-muted mb-2">
            {llmAnalysis}
          </p>
          <button className="border border-vigil-border uppercase text-[10px] tracking-wider py-1.5 w-18 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300">
            ✦ ask ai
          </button>
        </div>
      )}
    </div>
  );
}
