import { useId } from 'react';
import {
  Area,
  Bar,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type Series<T> = {
  key: keyof T & string;
  name: string;
  color: string;
  axis?: 'left' | 'right';
  kind?: 'area' | 'line' | 'bar';
  unit?: string;
};

type Props<T> = {
  data: T[];
  xKey: keyof T & string;
  series: Series<T>[];
  xFormatter?: (value: unknown, index: number) => string;
  xInterval?: number | 'preserveStartEnd';
  leftDomain?: [number | string, number | string];
  rightDomain?: [number | string, number | string];
  yTicks?: number;
  axisWidth?: number;
  grid?: string;
  tickColor?: string;
};

export default function MetricsChart<T extends Record<string, unknown>>({
  data,
  xKey,
  series,
  xFormatter,
  xInterval = 'preserveStartEnd',
  leftDomain = [0, 'auto'],
  rightDomain = [0, 'auto'],
  yTicks = 5,
  axisWidth = 36,
  grid = 'rgba(99,179,237,.08)',
  tickColor = '#4a5d7e',
}: Props<T>) {
  const uid = useId().replace(/:/g, '');
  const hasRight = series.some((s) => s.axis === 'right');
  const tick = { fill: tickColor, fontSize: 10 };

  return (
    <ResponsiveContainer width="100%" height="100%" className="mono">
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
      >
        <defs>
          {series
            .filter((s) => s.kind === 'area')
            .map((s) => (
              <linearGradient
                key={s.key}
                id={`${uid}-${s.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="1" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            ))}
        </defs>

        <CartesianGrid vertical={false} stroke={grid} />
        <XAxis
          dataKey={xKey as string}
          tickFormatter={xFormatter}
          interval={xInterval}
          tick={tick}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          domain={leftDomain}
          tickCount={yTicks}
          width={axisWidth}
          tick={tick}
          axisLine={false}
          tickLine={false}
        />
        {hasRight && (
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={rightDomain}
            tickCount={yTicks}
            width={axisWidth}
            tick={tick}
            axisLine={false}
            tickLine={false}
          />
        )}

        <Tooltip
          itemSorter={(item) => series.findIndex((s) => s.name === item.name)}
          contentStyle={{
            background: '#080d1a',
            border: '1px solid rgba(99,179,237,.2)',
            borderRadius: 0,
            fontSize: 12,
          }}
          labelStyle={{ color: '#e8f0ff' }}
          itemStyle={{ padding: 0 }}
          cursor={{ stroke: '#6b7da8', strokeDasharray: '3' }}
          labelFormatter={
            xFormatter ? (label) => xFormatter(label, -1) : undefined
          }
          formatter={(value, name) => {
            const unit = series.find((s) => s.name === name)?.unit;
            return [
              `${Math.round(Number(value))}${unit ? ` ${unit}` : ''}`,
              name,
            ];
          }}
        />

        {series.map((s) => {
          if (s.kind === 'bar') {
            return (
              <Bar
                key={s.key}
                yAxisId={s.axis ?? 'left'}
                dataKey={s.key as string}
                name={s.name}
                fill={s.color}
                fillOpacity={0.85}
                barSize={8}
                isAnimationActive={false}
              />
            );
          }
          const common = {
            yAxisId: s.axis ?? 'left',
            dataKey: s.key as string,
            name: s.name,
            stroke: s.color,
            strokeWidth: 2,
            type: 'monotone' as const,
            dot: false,
            activeDot: { r: 4, fill: s.color, stroke: 'none' },
            isAnimationActive: false,
          };
          return s.kind === 'area' ? (
            <Area key={s.key} {...common} fill={`url(#${uid}-${s.key})`} />
          ) : (
            <Line key={s.key} {...common} />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
