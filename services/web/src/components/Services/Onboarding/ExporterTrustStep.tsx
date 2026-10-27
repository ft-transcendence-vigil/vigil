import { useState } from 'react';
import type { TelemetryProfile } from '../../../data/serviceOnboarding';
import Button from '../../shared/Button';
import StepShell from './StepShell';

type Props = {
  stepNumber: number;
  totalSteps: number;
  caPath: string;
  profile: TelemetryProfile;
  existingInstrumentation: boolean;
};

export default function ExporterTrustStep({
  stepNumber,
  totalSteps,
  caPath,
  profile,
  existingInstrumentation,
}: Props) {
  const runtimeSetting = profile.caEnv
    ? `export ${profile.caEnv}="${caPath}"`
    : '';
  const collectorConfig = `exporters:\n  otlphttp/vigil:\n    endpoint: https://<vigil-host>/otlp\n    headers:\n      Authorization: "Bearer <ingestion_key>"\n    tls:\n      ca_file: "${caPath}"`;
  const [copied, setCopied] = useState(false);

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <StepShell
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      title="Configure exporter trust"
      description="Mounting the CA file only makes it available. The exporter that opens the HTTPS connection must also trust it."
    >
      <div className="space-y-5">
        <div className="border border-vigil-border bg-vigil-card p-4">
          <h3 className="font-semibold mb-2">SDK or agent trust</h3>
          <p className="text-[14px] text-vigil-muted leading-5">
            {profile.caHelp}
          </p>
          {runtimeSetting && (
            <div className="border border-vigil-border bg-[#070b14] mt-4">
              <div className="flex justify-between items-center px-3 py-3 border-b border-vigil-border">
                <span className="text-[12px] text-vigil-muted uppercase">
                  Bash
                </span>
                <Button
                  value={copied ? '✓' : 'copy'}
                  onClick={() => copy(runtimeSetting)}
                  className="py-1! px-3! text-[11px]!"
                />
              </div>
              <pre className="p-3 text-[14px] overflow-x-auto whitespace-pre-wrap">
                {runtimeSetting}
              </pre>
            </div>
          )}
        </div>
        {existingInstrumentation && (
          <div className="border border-vigil-border bg-vigil-card p-4">
            <h3 className="text-[14px] font-semibold mb-2">
              OpenTelemetry Collector exporter
            </h3>
            <p className="text-[11px] text-vigil-muted leading-5">
              If a Collector owns the connection to VIGIL, mount the CA into the
              Collector and configure tls.ca_file there.
            </p>
            <div className="border border-vigil-border bg-[#070b14] mt-4">
              <div className="flex justify-between items-center px-3 py-2 border-b border-vigil-border">
                <span className="text-[10px] text-vigil-muted uppercase">
                  Collector
                </span>
                <Button
                  value={copied ? '✓' : 'copy'}
                  onClick={() => copy(collectorConfig)}
                  className="py-1! px-3! text-[10px]!"
                />
              </div>
              <pre className="p-3 text-[11px] overflow-x-auto whitespace-pre-wrap">
                {collectorConfig}
              </pre>
            </div>
          </div>
        )}
      </div>
    </StepShell>
  );
}
