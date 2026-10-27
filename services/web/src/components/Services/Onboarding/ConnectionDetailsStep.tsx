import { useState } from 'react';
import Button from '../../shared/Button';
import StepShell from './StepShell';

type Props = {
  stepNumber: number;
  totalSteps: number;
  address: string;
  caPath: string;
  localTls: boolean;
};

export default function ConnectionDetailsStep({
  stepNumber,
  totalSteps,
  address,
  caPath,
  localTls,
}: Props) {
  const command = `curl -v --connect-timeout 5 --max-time 10${
    localTls ? ` --cacert "${caPath}"` : ''
  } "${address}/otlp/v1/logs"`;
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <StepShell
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      title="Connection details"
      description={`Selected HTTPS address: ${address}. Go back to Secure connection if you need to change it.`}
    >
      <div className="border border-vigil-border bg-vigil-card p-4">
        <h3 className="font-semibold mb-2">
          Test reachability from your service
        </h3>
        <p className="text-[13px] text-vigil-muted leading-5">
          Run this command from the process or container that will send
          telemetry.
        </p>
        <div className="border border-vigil-border bg-[#070b14] mt-4">
          <div className="flex justify-between items-center px-3 py-3 border-b border-vigil-border">
            <span className="text-[12px] text-vigil-muted uppercase">
              Shell
            </span>
            <Button
              value={copied ? '✓' : 'copy curl'}
              onClick={copy}
              className="py-1! px-3! text-[11px]! focus:tool"
            />
          </div>
          <pre className="px-3 py-4 text-[14px] overflow-x-auto whitespace-pre-wrap">
            {command}
          </pre>
        </div>
        <p className="text-[13px] text-vigil-muted mt-3 leading-5">
          A successful HTTPS connection proves reachability, not telemetry
          ingestion. A 401, 404, or 405 can still be expected from this simple
          test.
        </p>
      </div>
    </StepShell>
  );
}
