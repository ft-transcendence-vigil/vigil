import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  existingInstrumentationGuide,
  instrumentationGuides,
  telemetryProfiles,
  type InstrumentationSetup,
  type OnboardingStep,
  type ServiceLanguage,
  type TlsMode,
} from '../data/serviceOnboarding';
import type { ApiFetch } from '../api/api';
import {
  configureTlsAddress,
  getConfigKeys,
  getTlsCa,
} from '../api/serviceOnboardingApi';

const DEFAULT_CA_PATH = '/etc/vigil/vigil-ca.crt';
const DEFAULT_JAVA_AGENT_PATH = '/app/opentelemetry-javaagent.jar';
const DEFAULT_ADDRESS = 'https://localhost';

export default function useServiceOnboarding(apiFetch: ApiFetch) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [setup, setSetup] = useState<InstrumentationSetup>('recommended');
  const [language, setLanguage] = useState<ServiceLanguage>('');
  const [serviceName, setServiceName] = useState('');
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [tlsMode, setTlsMode] = useState<TlsMode>('unknown');
  const [caPath, setCaPath] = useState(DEFAULT_CA_PATH);
  const [javaAgentPath, setJavaAgentPath] = useState(DEFAULT_JAVA_AGENT_PATH);

  const configKeysQuery = useQuery({
    queryKey: ['config-keys'],
    queryFn: () => getConfigKeys(apiFetch),
  });

  const ingestionKey = configKeysQuery.data?.ingestion_key ?? '';

  const configureTlsMutation = useMutation({
    mutationFn: (address: string) => configureTlsAddress(apiFetch, address),

    onSuccess: (result) => {
      if (result.status !== 'verified' || !result.tls_mode) {
        setVerifiedAddress(null);
        setTlsMode('unknown');
        return;
      }
      setVerifiedAddress(result.address);
      setTlsMode(result.tls_mode);
    },
  });

  const downloadCaMutation = useMutation({
    mutationFn: () => getTlsCa(apiFetch),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'vigil-ca.crt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
    },
  });

  const needsNewInstrumentation = setup === 'recommended';
  const isLocalTls = verifiedAddress === address && tlsMode === 'local';

  const activeSteps = useMemo<OnboardingStep[]>(() => {
    const base: OnboardingStep[] = needsNewInstrumentation
      ? [1, 2, 3, 4, 5, 6, 7]
      : [1, 4, 5, 6, 7];
    if (isLocalTls) {
      base.push(8, 9);
    }
    base.push(10, 11);
    return base;
  }, [needsNewInstrumentation, isLocalTls]);

  const currentIndex = activeSteps.indexOf(step);
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === activeSteps.length - 1;

  const currentGuide = useMemo(() => {
    if (!needsNewInstrumentation) {
      return existingInstrumentationGuide;
    }

    if (!language) {
      return null;
    }
    return instrumentationGuides[language];
  }, [language, needsNewInstrumentation]);

  const profile = useMemo(() => {
    if (!language) {
      return telemetryProfiles.other;
    }
    return telemetryProfiles[language];
  }, [language]);

  function normalizeAddress(value: string) {
    const clean = value
      .trim()
      .replace(/^https:\/\//i, '')
      .replace(/\/+$/, '');
    return clean ? `https://${clean}` : '';
  }

  function setCustomAddress(value: string) {
    const nextAddress = normalizeAddress(value);

    setAddress(nextAddress);
    if (nextAddress !== verifiedAddress) {
      setVerifiedAddress(null);
      setTlsMode('unknown');
    }
    configureTlsMutation.reset();
  }

  function useLocalhost() {
    setAddress(DEFAULT_ADDRESS);
    setVerifiedAddress(DEFAULT_ADDRESS);
    setTlsMode('local');
    configureTlsMutation.reset();
  }

  function verifyAddress() {
    if (!address) {
      return;
    }
    configureTlsMutation.mutate(address);
  }

  function downloadCa() {
    downloadCaMutation.mutate();
  }

  function getIssue() {
    if (step === 2 && needsNewInstrumentation && !language) {
      return 'Choose your service language.';
    }

    if (
      step === 3 &&
      needsNewInstrumentation &&
      language === 'java' &&
      !javaAgentPath.trim()
    ) {
      return 'Enter the Java agent JAR path.';
    }

    if (step >= 4 && !serviceName.trim()) {
      return 'Enter a service name before continuing.';
    }

    if (step === 5 && configureTlsMutation.isPending) {
      return 'Wait for address verification to finish.';
    }

    if (step >= 5 && verifiedAddress !== address) {
      return 'Verify the HTTPS address before continuing.';
    }

    if (step >= 7 && configKeysQuery.isPending) {
      return 'Loading connection credentials.';
    }

    if (step >= 7 && configKeysQuery.isError) {
      return 'Unable to load connection credentials.';
    }

    if (step >= 7 && !ingestionKey) {
      return 'No ingestion key is available.';
    }

    if (step >= 8 && isLocalTls && !caPath.trim().startsWith('/')) {
      return 'Enter an absolute CA certificate path.';
    }
    return '';
  }

  const issue = getIssue();

  function next() {
    if (issue || isLastStep) {
      return;
    }

    const nextStep = activeSteps[currentIndex + 1];

    if (nextStep) {
      setStep(nextStep);
    }
  }

  function back() {
    if (isFirstStep) {
      return;
    }

    const previousStep = activeSteps[currentIndex - 1];

    if (previousStep) {
      setStep(previousStep);
    }
  }

  function reset() {
    setStep(1);
    setSetup('recommended');
    setLanguage('');
    setServiceName('');
    setAddress(DEFAULT_ADDRESS);
    setVerifiedAddress(null);
    setTlsMode('unknown');
    setCaPath(DEFAULT_CA_PATH);
    setJavaAgentPath(DEFAULT_JAVA_AGENT_PATH);
    configureTlsMutation.reset();
    downloadCaMutation.reset();
  }

  return {
    step,
    activeSteps,
    currentIndex,
    isFirstStep,
    isLastStep,
    issue,
    setup,
    setSetup,
    language,
    setLanguage,
    serviceName,
    setServiceName,
    address,
    setCustomAddress,
    verifiedAddress,
    tlsMode,
    isLocalTls,
    useLocalhost,
    verifyAddress,
    isVerifyingAddress: configureTlsMutation.isPending,
    verifyAddressError: configureTlsMutation.error,
    tlsVerificationPending: configureTlsMutation.data?.status === 'pending',
    tlsRetryAfterSeconds: configureTlsMutation.data?.retry_after_seconds,
    caPath,
    setCaPath,
    downloadCa,
    isDownloadingCa: downloadCaMutation.isPending,
    downloadCaError: downloadCaMutation.error,
    javaAgentPath,
    setJavaAgentPath,
    needsNewInstrumentation,
    currentGuide,
    profile,
    ingestionKey,
    configKeysLoading: configKeysQuery.isPending,
    configKeysError: configKeysQuery.error,
    next,
    back,
    reset,
  };
}
