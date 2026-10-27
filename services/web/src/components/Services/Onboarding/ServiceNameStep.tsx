import type { ChangeEvent } from 'react';
import StepShell from './StepShell';

type Props = {
  stepNumber: number;
  totalSteps: number;
  serviceName: string;
  onServiceNameChange: (value: string) => void;
};

export default function ServiceNameStep({
  stepNumber,
  totalSteps,
  serviceName,
  onServiceNameChange,
}: Props) {
  return (
    <StepShell
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      title="Service name"
      description="Name the service you want to monitor."
    >
      <label className="block text-[12px] uppercase tracking-wider text-vigil-muted mb-2">
        Service name
      </label>
      <input
        value={serviceName}
        onChange={(e: ChangeEvent<HTMLInputElement>) =>
          onServiceNameChange(e.target.value)
        }
        placeholder="checkout-api"
        autoComplete="off"
        spellCheck={false}
        className="w-full bg-vigil-card border border-vigil-border px-3 py-4 text-[15px] outline-none focus:border-[#2196f3]"
      />
      <p className="text-[13px] text-vigil-muted mt-2 leading-5">
        VIGIL uses the application service.name to identify and filter
        telemetry. Use this same value for OTEL_SERVICE_NAME.
      </p>
    </StepShell>
  );
}
