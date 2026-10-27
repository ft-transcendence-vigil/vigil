import useServiceOnboarding from '../../../hooks/useServiceOnboarding';
import useTelemetryVerification from '../../../hooks/useTelemetryVerification';
import { useAuth } from '../../../auth/authContext';
import ServiceSetupStep from './ServiceSetupStep';
import ServiceLanguageStep from './ServiceLanguageStep';
import InstrumentationStep from './InstrumentationStep';
import ServiceNameStep from './ServiceNameStep';
import SecureConnectionStep from './SecureConnectionStep';
import ConnectionDetailsStep from './ConnectionDetailsStep';
import TelemetryConfigStep from './TelemetryConfigStep';
import CaAvailabilityStep from './CaAvailabilityStep';
import ExporterTrustStep from './ExporterTrustStep';
import LaunchServiceStep from './LaunchServiceStep';
import VerifyTelemetryStep from './VerifyTelemetryStep';
import OnboardingProgress from './OnboardingProgress';
import OnboardingNavigation from './OnboardingNavigation';

type Props = {
  onExit: () => void;
  firstStepActionLabel: string;
  onAddAnother?: () => void;
};

export default function ServiceOnboardingWizard({
  onExit,
  firstStepActionLabel,
  onAddAnother,
}: Props) {
  const { apiFetch, accessToken } = useAuth();
  const onboarding = useServiceOnboarding(apiFetch);
  const telemetry = useTelemetryVerification({
    enabled: onboarding.step === 11,
    serviceName: onboarding.serviceName,
    accessToken,
  });
  const stepNumber = onboarding.currentIndex + 1;
  const totalSteps = onboarding.activeSteps.length;

  function renderStep() {
    switch (onboarding.step) {
      case 1:
        return (
          <ServiceSetupStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            setup={onboarding.setup}
            onSetupChange={onboarding.setSetup}
          />
        );
      case 2:
        return (
          <ServiceLanguageStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            language={onboarding.language}
            onLanguageChange={onboarding.setLanguage}
          />
        );
      case 3:
        return (
          <InstrumentationStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            guide={onboarding.currentGuide}
            isJava={
              onboarding.needsNewInstrumentation &&
              onboarding.language === 'java'
            }
            javaAgentPath={onboarding.javaAgentPath}
            onJavaAgentPathChange={onboarding.setJavaAgentPath}
          />
        );
      case 4:
        return (
          <ServiceNameStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            serviceName={onboarding.serviceName}
            onServiceNameChange={onboarding.setServiceName}
          />
        );
      case 5:
        return (
          <SecureConnectionStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            serviceName={onboarding.serviceName}
            address={onboarding.address}
            verifiedAddress={onboarding.verifiedAddress}
            tlsMode={onboarding.tlsMode}
            caPath={onboarding.caPath}
            isVerifyingAddress={onboarding.isVerifyingAddress}
            verifyAddressError={onboarding.verifyAddressError}
            tlsVerificationPending={onboarding.tlsVerificationPending}
            tlsRetryAfterSeconds={onboarding.tlsRetryAfterSeconds}
            onAddressChange={onboarding.setCustomAddress}
            onUseLocalhost={onboarding.useLocalhost}
            onVerifyAddress={onboarding.verifyAddress}
            onCaPathChange={onboarding.setCaPath}
          />
        );
      case 6:
        return (
          <ConnectionDetailsStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            address={onboarding.address}
            caPath={onboarding.caPath}
            localTls={onboarding.isLocalTls}
          />
        );
      case 7:
        return (
          <TelemetryConfigStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            setup={onboarding.setup}
            language={onboarding.language}
            serviceName={onboarding.serviceName}
            address={onboarding.address}
            caPath={onboarding.caPath}
            localTls={onboarding.isLocalTls}
            ingestionKey={onboarding.ingestionKey}
            javaAgentPath={onboarding.javaAgentPath}
            profile={onboarding.profile}
          />
        );
      case 8:
        return (
          <CaAvailabilityStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            caPath={onboarding.caPath}
            onDownloadCa={onboarding.downloadCa}
            isDownloadingCa={onboarding.isDownloadingCa}
            downloadCaError={onboarding.downloadCaError}
          />
        );
      case 9:
        return (
          <ExporterTrustStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            caPath={onboarding.caPath}
            profile={onboarding.profile}
            existingInstrumentation={!onboarding.needsNewInstrumentation}
          />
        );
      case 10:
        return (
          <LaunchServiceStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            guide={onboarding.currentGuide}
          />
        );
      case 11:
        return (
          <VerifyTelemetryStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            serviceName={onboarding.serviceName}
            received={telemetry.received}
            hasAnyTelemetry={telemetry.hasAnyTelemetry}
            allTelemetryReceived={telemetry.allTelemetryReceived}
            hasStreamError={telemetry.hasStreamError}
            missingToken={telemetry.missingToken}
            onRetry={telemetry.retry}
            onAddAnother={onAddAnother ?? onboarding.reset}
          />
        );
    }
  }

  return (
    <>
      <OnboardingProgress
        activeSteps={onboarding.activeSteps}
        currentIndex={onboarding.currentIndex}
      />
      <div className="flex min-h-0 flex-1 flex-col border border-vigil-border bg-vigil-card p-5 md:p-7">
        {renderStep()}
        <OnboardingNavigation
          isFirstStep={onboarding.isFirstStep}
          isLastStep={onboarding.isLastStep}
          issue={onboarding.issue}
          firstStepActionLabel={firstStepActionLabel}
          onBack={onboarding.back}
          onExit={onExit}
          onContinue={onboarding.next}
        />
      </div>
    </>
  );
}
