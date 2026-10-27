import type { InstrumentationGuide } from '../../../data/serviceOnboarding';
import Button from '../../shared/Button';
import StepShell from './StepShell';

type Props = {
  stepNumber: number;
  totalSteps: number;
  guide: InstrumentationGuide | null;
};

const buttonAnimation = 'transition-transform duration-150 active:scale-[0.98]';

export default function LaunchServiceStep({
  stepNumber,
  totalSteps,
  guide,
}: Props) {
  const launch = guide?.launch;

  async function copy() {
    if (!launch?.code) return;
    await navigator.clipboard.writeText(launch.code);
  }

  return (
    <StepShell
      stepNumber={stepNumber}
      totalSteps={totalSteps}
      title="Launch your service"
      description="Apply the generated configuration, start the service, and generate normal application traffic."
    >
      {launch && (
        <div className="border border-vigil-border bg-vigil-card p-4">
          <h3 className="font-semibold mb-2">{launch.title}</h3>
          <p className="text-[14px] text-vigil-muted leading-5">
            {launch.detail}
          </p>
          {launch.code && (
            <div className="border border-vigil-border bg-[#070b14] mt-4">
              <div className="flex justify-between items-center px-3 py-3 border-b border-vigil-border">
                <span className="text-[12px] text-vigil-muted uppercase">
                  {launch.language ?? 'Shell'}
                </span>
                <Button
                  value="copy launch command"
                  onClick={copy}
                  className={`${buttonAnimation} py-1! px-3! text-[11px]!`}
                />
              </div>
              <pre className="p-3 text-[14px] overflow-x-auto whitespace-pre-wrap">
                {launch.code}
              </pre>
            </div>
          )}
        </div>
      )}
    </StepShell>
  );
}
