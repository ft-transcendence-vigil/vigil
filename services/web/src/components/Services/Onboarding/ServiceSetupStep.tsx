import type { ChangeEvent } from 'react';
import StepShell from './StepShell';
import type { InstrumentationSetup } from '../../../data/serviceOnboarding';

type Props = {
  stepNumber: number;
  totalSteps: number;
  setup: InstrumentationSetup;
  onSetupChange: (setup: InstrumentationSetup) => void;
};

export default function ServiceSetupStep({
  stepNumber,
  totalSteps,
  setup,
  onSetupChange,
}: Props) {
  return (
    <StepShell
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      title="Service setup"
      description="Tell us how your application is set up. We'll tailor the next steps to your service."
    >
      <label className="block text-[12px] uppercase tracking-wider text-vigil-muted mb-2">
        Instrumentation setup
      </label>
      <select
        value={setup}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          onSetupChange(e.target.value as InstrumentationSetup)
        }
        className="w-full bg-vigil-card border border-vigil-border px-3 py-4 text-[15px] outline-none focus:border-vigil-blue"
      >
        <option value="recommended">
          This service is not instrumented yet
        </option>
        <option value="existing">
          This service already uses OpenTelemetry
        </option>
      </select>
      <p className="text-[13px] text-vigil-muted mt-3 leading-5">
        Already instrumented? Choose the second option if your service generates
        telemetry and has OTLP exporters configured.
      </p>
    </StepShell>
  );
}
