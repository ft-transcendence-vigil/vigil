import Button from '../../shared/Button';

type Props = {
  isFirstStep: boolean;
  isLastStep: boolean;
  issue: string;
  firstStepActionLabel: string;
  onBack: () => void;
  onExit: () => void;
  onContinue: () => void;
};

const buttonAnimation = 'transition-transform duration-150 active:scale-[0.98]';

export default function OnboardingNavigation({
  isFirstStep,
  isLastStep,
  issue,
  firstStepActionLabel,
  onBack,
  onExit,
  onContinue,
}: Props) {
  return (
    <div className="mt-6 flex items-center justify-between gap-4">
      <Button
        value={isFirstStep ? firstStepActionLabel : 'back'}
        onClick={isFirstStep ? onExit : onBack}
        className={`${buttonAnimation} bg-transparent! border! border-vigil-border! text-vigil-muted!`}
      />
      {!isLastStep && (
        <div className="ms-auto flex min-w-0 items-center gap-3">
          {issue && (
            <p className="hidden text-right text-[11px] text-amber-400 md:block">
              {issue}
            </p>
          )}
          <Button
            value="continue"
            onClick={onContinue}
            disabled={Boolean(issue)}
            className={buttonAnimation}
          />
        </div>
      )}
    </div>
  );
}
