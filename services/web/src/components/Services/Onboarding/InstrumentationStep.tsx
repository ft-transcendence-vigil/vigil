import { useState, type ChangeEvent } from 'react';
import Button from '../../shared/Button';
import type { InstrumentationGuide } from '../../../data/serviceOnboarding';
import StepShell from './StepShell';

type Props = {
  stepNumber: number;
  totalSteps: number;
  guide: InstrumentationGuide | null;
  isJava: boolean;
  javaAgentPath: string;
  onJavaAgentPathChange: (value: string) => void;
};

export default function InstrumentationStep({
  stepNumber,
  totalSteps,
  guide,
  isJava,
  javaAgentPath,
  onJavaAgentPathChange,
}: Props) {
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
      title="Instrument the service"
      description="Install and activate OpenTelemetry for this service before continuing."
    >
      <div className="space-y-5">
        {guide?.steps.map((item) => (
          <div
            key={item.title}
            className="border-t border-vigil-border first:border-t-0 first:pt-0 pt-5"
          >
            <h3 className="text-[16px] font-semibold mb-2">{item.title}</h3>
            <p className="text-[14px] text-vigil-muted leading-5">
              {item.detail}
            </p>
            {item.code && (
              <div className="mt-3 border border-vigil-border bg-[#070b14]">
                <div className="flex justify-between items-center px-3 py-3 border-b border-vigil-border">
                  <span className="text-[12px] text-vigil-muted uppercase">
                    {item.language ?? 'Shell'}
                  </span>
                  <Button
                    value={copied ? '✓' : 'copy'}
                    onClick={() => copy(item.code!)}
                    className="py-1! px-3! text-[11px]!"
                  />
                </div>
                <pre className="p-3 text-[12px] overflow-x-auto whitespace-pre-wrap">
                  {item.code}
                </pre>
              </div>
            )}
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-[14px] text-vigil-blue hover:underline"
              >
                {item.linkLabel}
              </a>
            )}
          </div>
        ))}
      </div>
      {isJava && (
        <div className="mt-6 pt-5 border-t border-vigil-border">
          <label className="block text-[13px] uppercase tracking-wider text-vigil-muted mb-2">
            Java agent JAR path
          </label>
          <input
            value={javaAgentPath}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onJavaAgentPathChange(e.target.value)
            }
            className="w-full bg-vigil-card border border-vigil-border px-3 py-4 text-[15px] outline-none focus:border-[#2196f3] mono"
          />
        </div>
      )}
      {guide && (
        <a
          href={guide.docs}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-5 text-[13px] text-vigil-blue hover:underline"
        >
          Official documentation ↗
        </a>
      )}
    </StepShell>
  );
}
