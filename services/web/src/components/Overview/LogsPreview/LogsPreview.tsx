import MOCK_DATA from './LogsPreviewData';
import LogsPreviewRow from './LogsPreviewRow';

export default function LogsPreview() {
  return (
    <div className="flex flex-col h-full min-h-0 border border-vigil-border bg-vigil-card overflow-hidden">
      <div className="flex justify-between border-b border-vigil-border px-3 sm:px-5 py-3 sticky bg-vigil-card z-40 top-0">
        <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">Logs</h2>
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
