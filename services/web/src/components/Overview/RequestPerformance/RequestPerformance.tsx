import type { Series } from './MetricsChart';
import MetricsChart from './MetricsChart';

export type Point = {
  ts: number;
  throughput: number;
  // null when the bucket has no spans, so the line shows a gap instead of 0ms
  latency: number | null;
  errors: number;
};

const SERIES: Series<Point>[] = [
  {
    key: 'throughput',
    name: 'Throughput',
    color: 'var(--vigil-accent)',
    kind: 'area',
    unit: 'spans/min',
  },
  {
    key: 'errors',
    name: 'Errors',
    color: 'var(--vigil-chart-error)',
    kind: 'bar',
    unit: 'errors/min',
  },
  {
    key: 'latency',
    name: 'Latency',
    color: 'var(--vigil-warning)',
    axis: 'right',
    unit: 'ms',
  },
];

interface Data {
  data: Point[];
  // ranges over 36h show the date instead of the time
  long: boolean;
  note?: string;
}

const formatX = (long: boolean) => (v: unknown) => {
  const date = new Date(v as number);
  return long
    ? `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}h`
    : date.toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
};

export default function RequestPerformance({ data, long, note }: Data) {
  return (
    <div className="flex flex-col h-full min-h-0 border border-vigil-border bg-vigil-card">
      <div className="mb-4 flex justify-between border-b border-vigil-border px-3 sm:px-5 py-3.5">
        <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">
          Request performance
          {note && (
            <span className="mono ms-2 text-[11px] text-vigil-muted-extra">
              {note}
            </span>
          )}
        </h2>
        <div className="flex gap-4 text-[11px] text-vigil-muted items-center">
          {SERIES.map((s) => (
            <span key={s.key}>
              <span
                className="me-1.5 inline-block h-2 w-2"
                style={{ background: s.color }}
              />
              {s.name}
            </span>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 px-1 sm:px-3 py-3">
        <MetricsChart
          data={data}
          xKey="ts"
          series={SERIES}
          xFormatter={formatX(long)}
        />
      </div>
    </div>
  );
}
