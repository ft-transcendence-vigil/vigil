import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Period } from '../../api/metricsApi';
import {
  chartRows,
  formatAxisValue,
  formatBucket,
  formatMetricValue,
  serviceColor,
  type MetricGroup,
} from './metricData';

interface Data {
  group: MetricGroup;
  services: string[];
  period: Period;
}

const tick = { fill: '#4a5d7e', fontSize: 10 };

export default function MetricChartCard({ group, services, period }: Data) {
  const rows = chartRows(group);

  return (
    <div className="flex flex-col bg-vigil-card border border-vigil-border p-3 sm:p-4">
      <div className="mono text-[12px] text-vigil-muted uppercase truncate mb-3">
        {group.name}
        {group.kind === 'counter' && ' (per second)'}
      </div>
      <div className="h-56 mono">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="rgba(99,179,237,.08)" />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(time: number) => formatBucket(time, period)}
              tick={tick}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={[0, 'auto']}
              tickFormatter={(value: number) =>
                formatAxisValue(value, group.unit)
              }
              width={44}
              tick={tick}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#080d1a',
                border: '1px solid rgba(99,179,237,.2)',
                borderRadius: 0,
                fontSize: 12,
              }}
              labelStyle={{ color: '#e8f0ff' }}
              itemStyle={{ padding: 0 }}
              cursor={{ stroke: '#6b7da8', strokeDasharray: '3' }}
              labelFormatter={(time) => new Date(Number(time)).toLocaleString()}
              formatter={(value, name) => [
                formatMetricValue(Number(value), group.unit, group.kind),
                name,
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 11, color: '#6b7da8' }}
            />
            {group.series.map((s) => (
              <Line
                key={s.service}
                dataKey={s.service}
                name={s.service}
                stroke={serviceColor(services, s.service)}
                strokeWidth={1.5}
                type="monotone"
                dot={false}
                connectNulls
                activeDot={{ r: 3, stroke: 'none' }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
