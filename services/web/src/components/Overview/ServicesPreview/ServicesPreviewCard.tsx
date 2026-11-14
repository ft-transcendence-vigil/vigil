import { formatDuration } from '../../shared/utils/format';
import { STATE_COLOR, formatRate, type ServiceSummary } from '../overviewData';

interface Data {
  service: ServiceSummary;
  selected: boolean;
  onClick: () => void;
}

export default function ServicesPreviewCard({
  service,
  selected,
  onClick,
}: Data) {
  const color = STATE_COLOR[service.state];
  return (
    <button
      type="button"
      title="Filter alerts, logs and the chart by this service"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex flex-col col-span-12 sm:col-span-6 xl:col-span-4 border p-2 bg-vigil-panel cursor-pointer hover:border-vigil-accent-border-hover transition-[border-color] duration-300 text-left ${selected ? 'border-vigil-accent' : 'border-vigil-border'}`}
    >
      <div className="flex justify-between items-center w-full gap-2">
        <p className="text-[13px] truncate" title={service.name}>
          <span
            className={`dot h-2 w-2 inline-block rounded-full me-3 ${color.bgColor}`}
          ></span>
          {service.name}
        </p>
        <span
          className={`shrink-0 text-[11px] uppercase tracking-wide ${color.textColor}`}
        >
          {service.state}
        </span>
      </div>
      <div className="flex justify-between items-center border border-vigil-border w-[90%] p-2 mt-2">
        <p className="truncate text-[15px] text-vigil-muted font-bold">
          {service.latency === null ? '—' : formatDuration(service.latency)}
        </p>
        <p className="truncate text-[12px] text-vigil-muted">
          {formatRate(service.rate)}
        </p>
      </div>
    </button>
  );
}
