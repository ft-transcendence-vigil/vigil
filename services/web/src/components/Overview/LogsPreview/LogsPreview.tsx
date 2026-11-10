import MOCK_DATA from './LogsPreviewData';
import LogsPreviewRow from './LogsPreviewRow';

export default function LogsPreview() {
  return (
    <div className="flex flex-col h-full min-h-0 border border-vigil-border bg-vigil-card overflow-hidden">
      <div className="flex justify-between items-center border-b border-vigil-border px-3 sm:px-5 py-3.5 sticky bg-vigil-card z-39 top-0">
        <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">
          Logs
        </h2>
        <div className="space-x-2">
          <button className="border border-vigil-border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 w-15 sm:w-17 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300">
            1h
          </button>
          <button className="border border-vigil-border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 w-15 sm:w-17 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300">
            24h
          </button>

          <button className="border border-vigil-border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 w-15 sm:w-17 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300">
            7d
          </button>
          <button className="border border-vigil-border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 w-15 sm:w-17 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300">
            30d
          </button>
          <button className="border border-vigil-border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 w-15 sm:w-17 cursor-pointer text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300">
            all →
          </button>
        </div>
      </div>
      <div className="overflow-y-auto scrollbar-vigil min-h-0 flex-1">
        {MOCK_DATA.map((d, i) => (
          <LogsPreviewRow
            key={i}
            date={d.date}
            severity={d.severity}
            title={d.title}
            threshold={d.threshold}
            className={d.className}
          />
        ))}
      </div>
    </div>
  );
}
