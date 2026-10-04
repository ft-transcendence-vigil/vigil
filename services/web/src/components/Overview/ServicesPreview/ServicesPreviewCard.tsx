type AlertSeverity = 'alerting' | 'degraded' | 'silent';

export interface Data {
  severity: AlertSeverity;
  title: string;
  latency: string;
  throughput: string;
  className: {
    bgColor: string;
    textColor: string;
  };
}

export default function ServicesPreviewCard({
  severity,
  title,
  latency,
  throughput,
  className,
}: Data) {
  return (
    <button className="flex flex-col col-span-12 sm:col-span-6 xl:col-span-4 border border-vigil-border p-2 bg-[#0D1425] cursor-pointer hover:border-[#2195f369] transition-[border-color] duration-300 focus:border-vigil-blue">
      <div className="flex justify-between items-center">
        <p className="text-[13px]">
          <span
            className={`dot h-2 w-2 inline-block rounded-full me-3 ${className.bgColor}`}
          ></span>
          {title}
        </p>
        <span
          className={`text-[11px] uppercase tracking-wide ${className.textColor}`}
        >
          {severity}
        </span>
      </div>
      <div className="flex justify-between items-center border border-vigil-border w-[90%] p-2 mt-2">
        <p className="truncate text-[15px] text-vigil-muted font-bold">{latency}</p>
        <p className="truncate text-[12px] text-vigil-muted">{throughput}</p>
      </div>
    </button>
  );
}
