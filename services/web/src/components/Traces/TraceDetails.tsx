import type { Trace } from '../../api/tracesApi';
import { formatTime } from '../shared/utils/format';

interface Data {
  span: Trace;
}

//atributes we will show 
const KEY_ATTRIBUTES = [
  'http.status_code',
  'http.response.status_code',
  'http.url',
  'url.full',
  'db.system',
  'db.statement',
  'rpc.method',
  'error.type',
  'exception.message',
];
//helper instead of each time rightting the two lines
function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-vigil-muted-extra text-[13px] break-all">
      {label}: <span className="text-white ms-1 text-[14px]">{value}</span>
    </p>
  );
}
//so we useing values is KEY_ATTRIBUTES as a key for the spans and if there is values then we want it if no t we dont
export default function TraceDetails({ span }: Data) {
  const attributes = KEY_ATTRIBUTES.filter((key) => span.attributes?.[key]).map(
    (key) => [key, span.attributes[key]],
  );

  return (
    <div className="bg-vigil-bg px-3 py-4.5 space-y-4 mono">
      <div>
        <div className="uppercase mb-2 text-[12px] text-vigil-muted-extra tracking-wider">
          Span
        </div>
        <div className="flex flex-wrap gap-x-25 gap-y-2">
          <Field label="trace_id" value={span.trace_id} />
          <Field label="span_id" value={span.span_id} />
          <Field label="parent" value={span.parent_span_id || 'root span'} />
          <Field label="time" value={formatTime(span.timestamp)} />
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
