import { useEffect, useState } from 'react';
import { useAuth } from '../auth/authContext';
import type { Trace } from '../api/tracesApi';

interface Params {
  enabled: boolean;
  service: string;
}

interface LiveState {
  service: string;
  traces: Trace[];
  connected: boolean;
  failed: boolean;
}

const MAX_LIVE_TRACES = 200;

function emptyState(service: string): LiveState {
  return { service, traces: [], connected: false, failed: false };
}

export default function useLiveTraces({ enabled, service }: Params) {
  const { accessToken } = useAuth();
  const [state, setState] = useState<LiveState>(() => emptyState(service));
  const current = state.service === service ? state : emptyState(service);

  useEffect(() => {
    if (!enabled || !accessToken) return;

    function updateState(updater: (current: LiveState) => LiveState) {
      setState((prev) =>
        updater(prev.service === service ? prev : emptyState(service)),
      );
    }

    const params = new URLSearchParams({ token: accessToken });
    if (service) params.set('service', service);
    const source = new EventSource(
      `/api/telemetry/traces/live?${params.toString()}`,
    );

    source.onopen = () => {
      updateState((s) => ({ ...s, connected: true, failed: false }));
    };

    source.onmessage = (event: MessageEvent<string>) => {
      let trace: Trace;
      try {
        trace = JSON.parse(event.data) as Trace;
      } catch {
        return;
      }
      updateState((s) => ({
        ...s,
        traces: [trace, ...s.traces].slice(0, MAX_LIVE_TRACES),
      }));
    };

    // EventSource reconnects on its own every few seconds, and each attempt
    // counts against the API rate limit, so stop and let the user retry.
    source.onerror = () => {
      source.close();
      updateState((s) => ({ ...s, connected: false, failed: true }));
    };

    return () => {
      source.close();
      updateState((s) => ({ ...s, connected: false }));
    };
  }, [enabled, service, accessToken]);

  return {
    liveTraces: current.traces,
    isConnected: enabled && current.connected,
    hasError: enabled && current.failed,
  };
}
