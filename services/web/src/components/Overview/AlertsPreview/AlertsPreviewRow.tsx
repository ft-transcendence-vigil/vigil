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
    <div>
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex justify-between items-center border-b border-b-vigil-border px-5 py-3 mono hover:bg-[rgba(99,179,237,.03)] transition-[background-color] duration-300 cursor-pointer"
      >
        <div className="flex items-center">
          <div
            className={`text-[10px] tracking-widest uppercase py-0.5 w-17 text-center me-3 ${className}`}
          >
            {severity}
          </div>
          <div>
            <div className="text-[12px] mb-0.5">{title}</div>
            <div className="text-[11px] text-vigil-muted-extra">
              {threshold}
            </div>
          </div>
        </div>
        <div>
          <span className="text-[11px] me-3 text-vigil-muted-extra">
            {date}
          </span>
          <button className="border border-vigil-border uppercase text-[11px] tracking-wider py-1.5 w-19 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300">
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
