import MOCK_DATA from './AlertsPreviewData';
import AlertsPreviewRow from './AlertsPreviewRow';

export default function AlertsPreview() {
  return (
    <div className="flex flex-col h-full min-h-0 border border-vigil-border bg-vigil-card overflow-hidden flex-1">
      <div className="flex justify-between border-b border-vigil-border px-3 sm:px-5 py-3 sticky bg-vigil-card z-40 top-0">
        <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">Alerts</h2>
      </div>
      <div className="overflow-y-auto scrollbar-vigil min-h-0 flex-1">
        {MOCK_DATA.map((d) => (
          <AlertsPreviewRow
            key={d.title}
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
