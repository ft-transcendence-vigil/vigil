import type {
  Metric,
  MetricKind,
  MetricSeries,
  Period,
} from '../../api/metricsApi';
import { formatDuration } from '../shared/utils/format';

export interface MetricGroup {
  name: string;
  unit: string;
  kind: MetricKind;
  series: MetricSeries[];
}

export type ChartRow = Record<string, number | null>;

const SERVICE_COLORS = [
  '#2196F3',
  '#00d68f',
  '#f59e0b',
  '#a855f7',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#6b7da8',
];
//we store by metrics name all the services that have the same metric name so they would be in the same chart
export function groupByName(series: MetricSeries[]): MetricGroup[] {
  //new dict we gonna store in
  const groups = new Map<string, MetricGroup>();
  //loop through series if current series name in group exists then  we push the serie into that group, otherwise we greate a new group
  for (const s of series) {
    const group = groups.get(s.name);
    if (group) group.series.push(s);
    else
      groups.set(s.name, {
        name: s.name,
        unit: s.unit,
        kind: s.kind,
        series: [s],
      });
  }
  //copy group values in new array and sort them alphabitically 
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}
//give service its color based on its position in our sorted services list 
export function serviceColor(services: string[], service: string): string {
  const index = services.indexOf(service);
  //max between 0 and our index if index is -1 turns into 0 just safty net and then round the number so if index is above 8 color we take the first
  return SERVICE_COLORS[Math.max(0, index) % SERVICE_COLORS.length];
}
//we group time and servies value in rows like { time: 1762956000000, 'checkout-api': 120 }
export function chartRows(group: MetricGroup): ChartRow[] {
  const rows = new Map<number, ChartRow>();
  for (const s of group.series) {
    for (const point of s.points) {
      //turn time stamp into a number
      const time = Date.parse(point.bucket);
      //if no time give it our time var
      const row = rows.get(time) ?? { time };
      //new key and value for sevice
      row[s.service] = point.value;
      //key is time value is the whole row
      rows.set(time, row);
    }
  }
  //sort row by the oldest
  return [...rows.values()].sort((a, b) => Number(a.time) - Number(b.time));
}
//if unit is 1 there is no unit other wise remove the curly braces
function cleanUnit(unit: string): string {
  return unit === '1' ? '' : unit.replace(/[{}]/g, '');
}

function formatNumber(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
//turn bytes into units readable
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;
  while (Math.abs(value) >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  //if bites add no num after decimal otherwise  add one return the whole format
  return `${value.toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function formatMetricValue(
  value: number,
  unit: string,
  //default gauge
  kind: MetricKind = 'gauge',
): string {
  //if kind is counter we clean unit example '{request}'	'req' we make req short it looks beter
  if (kind === 'counter') {
  const rateUnit = unit === '{request}' ? 'req' : cleanUnit(unit);
    //return unit if it exists if not defaulr /s
    return `${formatNumber(value)} ${rateUnit ? `${rateUnit}/s` : '/s'}`;
  }
  switch (unit) {
    case 'By':
      return formatBytes(value);
    case '%':
      return `${value.toFixed(1)}%`;
    case 'ms':
      return formatDuration(value);
    case 's':
      return formatDuration(value * 1000);
    default:
      return `${formatNumber(value)} ${cleanUnit(unit)}`.trim();
  }
}

export function formatAxisValue(value: number, unit: string): string {
  //if unit is bytes for mart it 
  if (unit === 'By') return formatBytes(value);
  //first param is always which langugage or format etc here we do undified we just choose our browser lang
  //we turn value to a string notation: 'compact' shorten big nums 12500  12.5K
  return value.toLocaleString(undefined, {
    notation: 'compact',
    //at most one num after column expect for 0
    maximumFractionDigits: 1,
  });
}

export function formatBucket(time: number, period: Period): string {
  const date = new Date(time);
  return period === '1h' || period === '24h'
  //if period is 1h or 24h write date to strinf in hour 2digits and min 2 digits format and no hour12 format
    ? date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    //if other periods write the date like 'Nov 12'
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

//a metric point has no id like span_id so we glue its time service name and attributes into one string to make it unique
//JSON.stringify turns the attributes object into text so it can be part of the string
//we use it as the react key to remove duplicates when merging live points and to remember the open row
export function metricKey(metric: Metric): string {
  return `${metric.timestamp}|${metric.service}|${metric.name}|${JSON.stringify(metric.attributes)}`;
}
