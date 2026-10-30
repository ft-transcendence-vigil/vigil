import { useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import type { Trace } from '../../api/tracesApi';
import { formatDuration, formatTime } from '../shared/utils/format';
import { statusColors } from './traceColors';

interface Data {
  traceId: string;
  span: Trace | null;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-vigil-border text-[13px]">
      <span className="text-vigil-muted shrink-0">{label}</span>
      <span className="mono text-right break-all">{value}</span>
    </div>
  );
}

export default function TraceDrawer({ traceId, span, onClose }: Data) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const attributes = Object.entries(span?.attributes ?? {});

  return (
    <>
      <div className="vigil-overlay" onClick={onClose} />
      <aside className="fixed top-0 right-0 bottom-0 z-100 w-full sm:w-110 flex flex-col bg-vigil-card border-l border-vigil-border">
        <div className="flex justify-between items-center border-b border-vigil-border px-5 py-4">
          <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">
            Span detail
          </h2>
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="cursor-pointer text-vigil-muted hover:text-white transition-colors duration-200"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {!span ? (
            <p className="text-[13px] text-vigil-muted">
              Trace <span className="mono">{traceId}</span> is not in the loaded
              spans. Widen the period or load more results.
            </p>
          ) : (
            <>
              <section>
                <h3 className="uppercase text-[12px] tracking-wider text-vigil-muted mb-2">
                  Identifiers
                </h3>
                <Field label="trace_id" value={span.trace_id} />
                <Field label="span_id" value={span.span_id} />
                <Field
                  label="parent_span_id"
                  value={span.parent_span_id || 'root span'}
                />
                <Field label="service" value={span.service} />
                <Field label="name" value={span.name} />
                <Field label="time" value={formatTime(span.timestamp)} />
                <Field
                  label="duration"
                  value={formatDuration(span.duration_ms)}
                />
                <div className="flex justify-between py-1.5 text-[13px]">
                  <span className="text-vigil-muted">status</span>
                  <span
                    className={`px-2 py-0.5 mono ${statusColors[span.status]}`}
                  >
                    {span.status}
                  </span>
                </div>
              </section>
              <section>
                <h3 className="uppercase text-[12px] tracking-wider text-vigil-muted mb-2">
                  Attributes
                </h3>
                {attributes.length === 0 ? (
                  <p className="text-[13px] text-vigil-muted">
                    No attributes recorded.
                  </p>
                ) : (
                  attributes.map(([key, value]) => (
                    <Field key={key} label={key} value={value} />
                  ))
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
