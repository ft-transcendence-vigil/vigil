import { Link } from 'react-router-dom';
import Button from '../../shared/Button';
import StepShell from './StepShell';
import type { TelemetrySignals } from '../../../hooks/useTelemetryVerification';

interface Props {
  stepNumber: number;
  totalSteps: number;
  serviceName: string;
  received: TelemetrySignals;
  hasAnyTelemetry: boolean;
  allTelemetryReceived: boolean;
  hasStreamError: boolean;
  missingToken: boolean;
  onRetry: () => void;
  onAddAnother: () => void;
}

const buttonAnimation = 'transition-transform duration-150 active:scale-[0.98]';

interface SignalProps {
  name: string;
  received: boolean;
}

function SignalStatus({ name, received }: SignalProps) {
  return (
    <div
      className={`border px-3 py-2 text-[12px] ${
        received
          ? 'border-emerald-500/40 text-emerald-400'
          : 'border-vigil-border text-vigil-muted'
      }`}
    >
      {name} · {received ? 'received' : 'waiting'}
    </div>
  );
}

export default function VerifyTelemetryStep({
  stepNumber,
  totalSteps,
  serviceName,
  received,
  hasAnyTelemetry,
  allTelemetryReceived,
  hasStreamError,
  missingToken,
  onRetry,
  onAddAnother,
}: Props) {
  return (
    <StepShell
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      title="Confirm telemetry is arriving"
      description="Start your service with the generated configuration, then make a few requests so it produces telemetry."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <SignalStatus name="Logs" received={received.logs} />
        <SignalStatus name="Traces" received={received.traces} />
        <SignalStatus name="Metrics" received={received.metrics} />
      </div>
      <div className="border border-vigil-border bg-vigil-card p-4">
        {missingToken ? (
          <>
            <h3 className="text-[15px] font-semibold text-red-400">
              Authentication unavailable
            </h3>
            <p className="mt-2 text-[13px] leading-5 text-vigil-muted">
              VIGIL does not currently have an access token for the live
              telemetry connection.
            </p>
          </>
        ) : hasAnyTelemetry ? (
          <>
            <h3 className="text-[15px] font-semibold text-emerald-400">
              Telemetry received from {serviceName}
            </h3>
            <p className="mt-2 text-[13px] leading-5 text-vigil-muted">
              {allTelemetryReceived
                ? 'Logs, traces, and metrics have all arrived.'
                : 'Connectivity is confirmed. Signals still marked waiting may need more application traffic or additional instrumentation.'}
            </p>
          </>
        ) : (
          <>
            <h3 className="text-[15px] font-semibold">
              Waiting for telemetry from {serviceName}...
            </h3>
            <p className="mt-2 text-[13px] leading-5 text-vigil-muted">
              Keep this page open while your service sends logs, traces, or
              metrics.
            </p>
          </>
        )}
      </div>
      {hasStreamError && !hasAnyTelemetry && (
        <div className="mt-4">
          <p className="mb-3 text-[13px] text-red-400">
            One or more live telemetry streams could not connect. EventSource
            retries automatically, but you can also restart the check.
          </p>
          <Button
            value="RETRY TELEMETRY CHECK"
            onClick={onRetry}
            className={buttonAnimation}
          />
        </div>
      )}
      {hasAnyTelemetry && (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <Link
              to="/traces"
              className="border border-vigil-border p-4 text-[13px] transition-colors hover:border-vigil-blue"
            >
              View traces →
            </Link>
            <Link
              to="/metrics"
              className="border border-vigil-border p-4 text-[13px] transition-colors hover:border-vigil-blue"
            >
              View metrics →
            </Link>
            <Link
              to="/logs"
              className="border border-vigil-border p-4 text-[13px] transition-colors hover:border-vigil-blue"
            >
              View logs →
            </Link>
          </div>
          <div className="mt-5">
            <Button
              value="ADD ANOTHER SERVICE"
              onClick={onAddAnother}
              className={buttonAnimation}
            />
          </div>
        </>
      )}
      <details className="mt-6 border-t border-vigil-border pt-4">
        <summary className="cursor-pointer text-[13px] font-medium">
          No data appears?
        </summary>
        <p className="mt-3 text-[13px] leading-5 text-vigil-muted">
          Confirm that OTEL_SERVICE_NAME matches{' '}
          <code className="mono">{serviceName}</code>, the service can reach the
          selected VIGIL address, OTLP/HTTP is being used, the ingestion header
          is present, and the exporter is not reporting TLS or connection
          errors.
        </p>
      </details>
    </StepShell>
  );
}
