import type { Metric } from '../../api/metricsApi';
import { formatTime } from '../shared/utils/format';

interface Data {
  metric: Metric;
}

//deny list we show every attribute except these ones
//on metrics the attributes are what separate one series from another like get vs post or 200 vs 500 or a custom label like region
//we cant know them all so we hide only the known noise, traces use an allow list instead because most span attributes are noise
const HIDDEN_KEYS = [
  'service.name',
  'service.version',
  'deployment.environment',
  'host.name',
  'http.flavor',
  'http.scheme',
  'http.host',
  'http.server_name',
];
//prefixes hide whole families at once like every telemetry.sdk key
const HIDDEN_PREFIXES = ['telemetry.', 'vigil.', 'net.host.', 'net.peer.'];

//includes checks if the name is exactly in the list like key in list in python
//some returns true if the name starts with at least one prefix like any() in python
function isHidden(key: string) {
  return (
    HIDDEN_KEYS.includes(key) ||
    HIDDEN_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-vigil-muted-extra text-[13px] break-all">
      {label}: <span className="text-white ms-1 text-[14px]">{value}</span>
    </p>
  );
}

export default function MetricDetails({ metric }: Data) {
  //turn the attributes into key value pairs and keep only the ones that arent hidden
  const attributes = Object.entries(metric.attributes).filter(
    ([key]) => !isHidden(key),
  );

  return (
    <div className="bg-vigil-bg px-3 py-4.5 space-y-4 mono">
      <div>
        <div className="uppercase mb-2 text-[12px] text-vigil-muted-extra tracking-wider">
          Point
        </div>
        <div className="flex flex-wrap gap-x-25 gap-y-2">
          <Field label="time" value={formatTime(metric.timestamp)} />
        </div>
      </div>
      {attributes.length > 0 && (
        <div>
          <div className="uppercase mb-2 text-[12px] text-vigil-muted-extra tracking-wider">
            Attributes
          </div>
          <div className="flex flex-wrap gap-x-25 gap-y-2">
            {attributes.map(([key, value]) => (
              <Field key={key} label={key} value={value} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
