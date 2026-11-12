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
//the numbers bollow and on the left color and font size
const tick = { fill: '#4a5d7e', fontSize: 10 };

export default function MetricChartCard({ group, services, period }: Data) {
  const rows = chartRows(group);

  return (
    //box around  chart styling
    <div className="flex flex-col bg-vigil-card border border-vigil-border p-3 sm:p-4">
    {/* title and if kind is counter add per second */}
      <div className="mono text-[12px] text-vigil-muted uppercase truncate mb-3">
        {group.name}
        {group.kind === 'counter' && ' (per second)'}
      </div>
      {/* chart box styling */}
      <div className="h-56 mono">
        {/* fit the chart into its box */}
        <ResponsiveContainer width="100%" height="100%">
          {/* give chart our data */}
          <LineChart
            data={rows}
            margin={{ top: 10, right: 0, bottom: 0, left: 0 }}
          >
            {/* those horizantal lines in the background */}
            <CartesianGrid vertical={false} stroke="rgba(99,179,237,.08)" />
            {/* the horizantal line of time we give it dataKey="time" to place the points of data in chart type="number" type of the data scale="time" the numbers are timestamps in milliseconds  domain={['dataMin', 'dataMax']} the range the axis covers 'dataMin': a special word Recharts understands the smallest time in the data*/}
            {/* tickFormatter how to write the label under the axis give Recharts a function  each tick it’s about to draw Recharts calls function with that tick’s value */}
            {/* tick={tick} tick style 
              axisLine={false} no axis line we already have those horizantal lines
              tickLine={false} no tick lines we only want the line
              minTickGap={24} gap between labels no smaller than 24px*/}
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
            {/* domain={[0, 'auto']} YAxis range from 0 till anumber above our max value*/}
            {/* width={44} width of the left labels tickFormatter how the left labels would look like*/}
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
            {/* the box when we hover over a tick*/}     
            {/* contentStyle style of the whole box. labelStyle title style. itemStyle no padding between name value. cursor virtical line that appears when u hover labelFormatter how to write the title. formatter how to write name value*/}
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
            {/* service name written under the chart styleing*/} 
            <Legend
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 11, color: '#6b7da8' }}
            />
            {/* dataKey the values we wanna draw key is service and value is the data
                key for react to know which line is whcih because map draw multiple Line
                stroke
                strokeWidth
                type
                line color width and smoothness. dot={false} no dot. connectNulls when there is no data in the middle connect the line it will be just straight. activeDot small circle on hover, isAnimationActive no animation when drawing the line */} 
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
