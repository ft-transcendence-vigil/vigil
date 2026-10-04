import type { Series } from './MetricsChart';
import MetricsChart from './MetricsChart';

export type Point = {
  ts: number;
  throughput: number;
  latency: number;
  errors: number;
};

const SERIES: Series<Point>[] = [
  {
    key: 'throughput',
    name: 'Throughput',
    color: '#2196F3',
    kind: 'area',
    unit: 'req/s',
  },
  {
    key: 'errors',
    name: 'Errors',
    color: '#ef4444',
    kind: 'bar',
    unit: 'req/s',
  },
  {
    key: 'latency',
    name: 'Latency',
    color: '#f59e0b',
    axis: 'right',
    unit: 'ms',
  },
];

export default function RequestPerformance({ data }: { data: Point[] }) {
  return (
    <div className="flex h-130 flex-col border border-vigil-border bg-vigil-card">
      <div className="mb-4 flex justify-between border-b border-vigil-border px-5 py-3">
        <h2 className="text-[17px] font-medium tracking-wide">
          Request performance
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
      <div className="min-h-0 flex-1 px-5 py-3">
        <MetricsChart
          data={data}
          xKey="ts"
          series={SERIES}
          xFormatter={(v) =>
            new Date(v as number).toLocaleTimeString([], {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            })
          }
        />
      </div>
    </div>
  );
}
