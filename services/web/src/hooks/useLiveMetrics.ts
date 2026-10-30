import { useEffect, useState } from 'react';
import { useAuth } from '../auth/authContext';
import type { Metric } from '../api/metricsApi';

interface Params {
  enabled: boolean;
  service: string;
}

interface LiveState {
  service: string;
  metrics: Metric[];
  connected: boolean;
  failed: boolean;
}

const MAX_LIVE_METRICS = 200;

function emptyState(service: string): LiveState {
  return { service, metrics: [], connected: false, failed: false };
}

export default function useLiveMetrics({ enabled, service }: Params) {
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
      `/api/telemetry/metrics/live?${params.toString()}`,
    );

    source.onopen = () => {
      updateState((s) => ({ ...s, connected: true, failed: false }));
    };

    source.onmessage = (event: MessageEvent<string>) => {
      let metric: Metric;
      try {
        metric = JSON.parse(event.data) as Metric;
      } catch {
        return;
      }
      updateState((s) => ({
        ...s,
        metrics: [metric, ...s.metrics].slice(0, MAX_LIVE_METRICS),
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
    liveMetrics: current.metrics,
    isConnected: enabled && current.connected,
    hasError: enabled && current.failed,
  };
}
