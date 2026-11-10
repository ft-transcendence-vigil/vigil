import AlertsPreviewRow from './AlertsPreviewRow';
import MOCK_DATA from './AlertsPreviewData';

export default function AlertsPreview() {
  return (
    <div className="flex flex-col h-full min-h-0 border border-vigil-border bg-vigil-card overflow-hidden flex-1">
      <div className="flex justify-between items-center border-b border-vigil-border px-3 sm:px-5 py-3 sticky bg-vigil-card z-39 top-0">
        <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">
          Alerts
        </h2>
        <div className="space-x-2">
          <button className="border border-vigil-border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 w-15 sm:w-17 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300">
            open
          </button>
          <button className="border border-vigil-border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 w-15 sm:w-17 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300">
            critical
          </button>
          <button className="border border-vigil-border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 w-15 sm:w-17 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300">
            warning
          </button>
        </div>
      </div>
      <div className="overflow-y-auto scrollbar-vigil min-h-0 flex-1">
        {MOCK_DATA.map((d) => (
          <AlertsPreviewRow
            key={d.date + d.llmAnalysis}
            severity={d.severity}
            title={d.title}
            threshold={d.threshold}
            date={d.date}
            action={d.action}
            llmAnalysis={d.llmAnalysis}
            className={d.className}
          />
        ))}
      </div>
    </div>
  );
}
