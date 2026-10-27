import type { ReactNode } from 'react';

type Props = {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description?: string;
  children: ReactNode;
};

export default function StepShell({
  stepNumber,
  totalSteps,
  title,
  description,
  children,
}: Props) {
  return (
    <section className="flex-1 min-h-0 overflow-y-auto">
      <p className="text-[11px] tracking-[0.18em] text-vigil-blue uppercase mb-2">
        step {String(stepNumber).padStart(2, '0')} /{' '}
        {String(totalSteps).padStart(2, '0')}
      </p>
      <h2 className="text-[22px] md:text-[26px] font-semibold">{title}</h2>
      {description && (
        <p className="text-[13px] md:text-[14px] text-vigil-muted leading-6 mb-6">
          {description}
        </p>
      )}
      {children}
    </section>
  );
}
