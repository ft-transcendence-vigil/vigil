import Button from '../../shared/Button';
import StepShell from './StepShell';
import type {
  InstrumentationSetup,
  ServiceLanguage,
  TelemetryProfile,
} from '../../../data/serviceOnboarding';
import { useState } from 'react';

type Props = {
  stepNumber: number;
  totalSteps: number;
  setup: InstrumentationSetup;
  language: ServiceLanguage;
  serviceName: string;
  address: string;
  caPath: string;
  localTls: boolean;
  ingestionKey: string;
  javaAgentPath: string;
  profile: TelemetryProfile;
};

export default function TelemetryConfigStep({
  stepNumber,
  totalSteps,
  setup,
  language,
  serviceName,
  address,
  caPath,
  localTls,
  ingestionKey,
  javaAgentPath,
  profile,
}: Props) {
  const lines = [
    `export OTEL_SERVICE_NAME="${serviceName}"`,
    `export OTEL_EXPORTER_OTLP_ENDPOINT="${address}/otlp"`,
    language === 'go' && setup === 'recommended'
      ? null
      : 'export OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"',
    `export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer%20${ingestionKey || '<ingestion_key>'}"`,
    setup === 'recommended' ? 'export OTEL_TRACES_EXPORTER="otlp"' : null,
    setup === 'recommended' ? 'export OTEL_METRICS_EXPORTER="otlp"' : null,
    setup === 'recommended' ? 'export OTEL_LOGS_EXPORTER="otlp"' : null,
    language === 'java' && setup === 'recommended'
      ? `export JAVA_TOOL_OPTIONS="-javaagent:${javaAgentPath}"`
      : null,
    localTls && profile.caEnv ? `export ${profile.caEnv}="${caPath}"` : null,
  ].filter(Boolean) as string[];

  const config = lines.join('\n');

  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <StepShell
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      title={`Telemetry configuration for ${serviceName}`}
      description="Add these variables to the service runtime configuration and restart it. Treat the ingestion key as a secret."
    >
      <p className="text-[13px] text-vigil-muted mb-3">{profile.note}</p>
      <div className="border border-vigil-border bg-[#070b14]">
        <div className="flex justify-between items-center px-3 py-3 border-b border-vigil-border">
          <span className="text-[12px] text-vigil-muted uppercase">Bash</span>
          <Button
            value={copied ? '✓' : 'copy configuration'}
            onClick={copy}
            className={`py-1.5! px-3! text-[11px]!`}
          />
        </div>
        <pre className="p-3 text-[14px] overflow-x-auto whitespace-pre-wrap">
          {config}
        </pre>
      </div>
      <p className="text-[14px] text-amber-400 mt-4">
        Server-side only: never put the ingestion key in browser JavaScript.
      </p>
    </StepShell>
  );
}
