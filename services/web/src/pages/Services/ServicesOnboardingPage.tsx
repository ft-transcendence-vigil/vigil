import { useNavigate } from 'react-router-dom';
import ServiceOnboardingWizard from '../../components/Services/Onboarding/ServiceOnboardingWizard';

export default function ServicesOnboardingPage() {
  const navigate = useNavigate();

  return (
    <main className="h-full overflow-hidden px-4 md:px-8">
      <div className="mx-auto flex h-full max-w-205 flex-col">
        <div className="mb-6 text-center">
          <p className="text-[12px] text-emerald-400">
            YOUR ADMIN ACCOUNT IS READY
          </p>
          <h1 className="mb-2 text-[25px] font-semibold md:text-[36px]">
            Connect your first service
          </h1>
          <p className="mx-auto text-[13px] leading-6 text-vigil-muted md:w-150 md:text-[15px]">
            We'll guide you through instrumentation, a secure connection, and
            verification. Keep this page open while VIGIL waits for your first
            logs, traces, or metrics.
          </p>
        </div>
        <ServiceOnboardingWizard
          firstStepActionLabel="skip for now"
          onExit={() => navigate('/overview')}
          onAddAnother={() => navigate('/add-service')}
        />
      </div>
    </main>
  );
}
