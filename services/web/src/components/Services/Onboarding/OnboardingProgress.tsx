import {
  STEP_LABELS,
  type OnboardingStep,
} from '../../../data/serviceOnboarding';

type Props = {
  activeSteps: OnboardingStep[];
  currentIndex: number;
};

export default function OnboardingProgress({
  activeSteps,
  currentIndex,
}: Props) {
  return (
    <div className="flex items-center mb-4" aria-label="Onboarding progress">
      {activeSteps.map((step, index) => (
        <div key={step} className="contents">
          {index > 0 && (
            <div
              className={`h-px flex-1 mx-2 ${index <= currentIndex ? 'bg-vigil-accent' : 'bg-vigil-border'}`}
            />
          )}
          <div className="flex items-center gap-2 min-w-0">
            <h1
              className={`w-7 h-7 shrink-0 border grid place-items-center text-[12px] tracking-widest ${
                index < currentIndex
                  ? 'bg-vigil-accent border-vigil-accent text-vigil-on-accent font-bold'
                  : index === currentIndex
                    ? 'border-vigil-accent text-vigil-accent'
                    : 'border-vigil-border text-vigil-muted'
              }`}
            >
              {index < currentIndex ? '✓' : String(index + 1).padStart(2, '0')}
            </h1>
            {index === currentIndex && (
              <span className="hidden sm:block text-[11px] tracking-widest text-vigil-muted uppercase">
                {STEP_LABELS[step]}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
