import { useNavigate } from 'react-router-dom';
import ServiceOnboardingWizard from '../../components/Services/Onboarding/ServiceOnboardingWizard';

export default function AddServicePage() {
  const navigate = useNavigate();

  return (
    <main className="h-full overflow-hidden px-4 md:px-8">
      <div className="mx-auto flex h-full max-w-205 flex-col">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-vigil-blue">
            Services
          </p>
          <h1 className="mb-2 text-[25px] font-semibold md:text-[32px]">
            Connect a service
          </h1>
          <p className="text-[13px] leading-6 text-vigil-muted md:text-[14px]">
            Instrument a service, configure its connection to VIGIL, and verify
            that telemetry is arriving.
          </p>
        </div>
        <ServiceOnboardingWizard
          firstStepActionLabel="cancel"
          onExit={() => navigate('/overview')}
        />
      </div>
    </main>
  );
}
