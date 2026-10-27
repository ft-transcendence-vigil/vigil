import type { ChangeEvent } from 'react';
import StepShell from './StepShell';
import type { ServiceLanguage } from '../../../data/serviceOnboarding';

type Props = {
  stepNumber: number;
  totalSteps: number;
  language: ServiceLanguage;
  onLanguageChange: (language: ServiceLanguage) => void;
};

export default function ServiceLanguageStep({
  stepNumber,
  totalSteps,
  language,
  onLanguageChange,
}: Props) {
  return (
    <StepShell
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      title="Service language"
      description="We'll show the OpenTelemetry setup for your runtime."
    >
      <label className="block text-[12px] uppercase tracking-wider text-vigil-muted mb-2">
        Language
      </label>
      <select
        value={language}
        onChange={(e: ChangeEvent<HTMLSelectElement>) =>
          onLanguageChange(e.target.value as ServiceLanguage)
        }
        className="w-full bg-vigil-card border border-vigil-border px-3 py-4 text-[15px] outline-none focus:border-vigil-blue"
      >
        <option value="">Choose a language</option>
        <option value="java">Java</option>
        <option value="node">Node.js / JavaScript</option>
        <option value="python">Python</option>
        <option value="dotnet">.NET 8+ / ASP.NET Core</option>
        <option value="go">Go</option>
        <option value="other">Other language</option>
      </select>
    </StepShell>
  );
}
