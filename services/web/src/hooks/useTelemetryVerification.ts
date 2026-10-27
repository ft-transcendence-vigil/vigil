import { useEffect, useMemo, useState } from 'react';

export interface TelemetrySignals {
  logs: boolean;
  traces: boolean;
  metrics: boolean;
}

interface StreamErrors {
  logs: boolean;
  traces: boolean;
  metrics: boolean;
}

interface TelemetryState {
  serviceName: string;
  received: TelemetrySignals;
  errors: StreamErrors;
}

interface Params {
  enabled: boolean;
  serviceName: string;
  accessToken: string | null;
}

type Signal = keyof TelemetrySignals;

const signals: Signal[] = ['logs', 'traces', 'metrics'];

function emptySignals(): TelemetrySignals {
  return {
    logs: false,
    traces: false,
    metrics: false,
  };
}

function emptyErrors(): StreamErrors {
  return {
    logs: false,
    traces: false,
    metrics: false,
  };
}

function emptyState(serviceName: string): TelemetryState {
  return {
    serviceName,
    received: emptySignals(),
    errors: emptyErrors(),
  };
}

export default function useTelemetryVerification({
  enabled,
  serviceName,
  accessToken,
}: Params) {
  const [state, setState] = useState<TelemetryState>(() =>
    emptyState(serviceName),
  );
  const [retryVersion, setRetryVersion] = useState(0);
  const currentState =
    state.serviceName === serviceName ? state : emptyState(serviceName);
  const received = currentState.received;
  const streamErrors = currentState.errors;

  useEffect(() => {
    if (!enabled || !serviceName || !accessToken) {
      return;
    }
    const sources: EventSource[] = [];

    function updateState(updater: (current: TelemetryState) => TelemetryState) {
      setState((current) => {
        const base =
          current.serviceName === serviceName
            ? current
            : emptyState(serviceName);
        return updater(base);
      });
    }

    for (const signal of signals) {
      const params = new URLSearchParams({
        service: serviceName,
        token: accessToken,
      });

      const source = new EventSource(
        `/api/telemetry/${signal}/live?${params.toString()}`,
      );

      source.onopen = () => {
        updateState((current) => ({
          ...current,
          errors: {
            ...current.errors,
            [signal]: false,
          },
        }));
      };

      source.onmessage = () => {
        updateState((current) => ({
          ...current,
          received: {
            ...current.received,
            [signal]: true,
          },
          errors: {
            ...current.errors,
            [signal]: false,
          },
        }));
      };

      source.onerror = () => {
        updateState((current) => ({
          ...current,
          errors: {
            ...current.errors,
            [signal]: true,
          },
        }));
      };
      sources.push(source);
    }

    return () => {
      sources.forEach((source) => {
        source.close();
      });
    };
  }, [enabled, serviceName, accessToken, retryVersion]);

  const hasAnyTelemetry = useMemo(
    () => received.logs || received.traces || received.metrics,
    [received],
  );

  const allTelemetryReceived = useMemo(
    () => received.logs && received.traces && received.metrics,
    [received],
  );

  const hasStreamError = useMemo(
    () => streamErrors.logs || streamErrors.traces || streamErrors.metrics,
    [streamErrors],
  );

  function retry() {
    setState(emptyState(serviceName));
    setRetryVersion((version) => version + 1);
  }

  return {
    received,
    hasAnyTelemetry,
    allTelemetryReceived,
    hasStreamError,
    missingToken: enabled && !accessToken,
    retry,
  };
}
