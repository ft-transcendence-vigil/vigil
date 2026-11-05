import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/authContext';
import type { LogsSeverity } from '../components/Logs/LogsRow';
import type { Log } from '../api/logsApi';

interface Data {
  service?: string;
  severity?: LogsSeverity;
  enabled: boolean;
  onLog: (log: Log) => void;
  onError?: () => void;
}

export default function useLiveLogs({
  service,
  severity,
  enabled,
  onLog,
  onError,
}: Data) {
  const { accessToken } = useAuth();
  const onLogRef = useRef(onLog);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onLogRef.current = onLog;
  }, [onLog]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!accessToken || !enabled) return;

    const params = new URLSearchParams({
      token: accessToken,
    });
    if (service) params.set('service', service);
    if (severity) params.set('severity', severity);

    const source = new EventSource(
      `/api/telemetry/logs/live?${params.toString()}`,
    );

    source.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        onLogRef.current(log);
      } catch {
        return;
      }
    };

    source.onerror = () => {
      source.close();
      onErrorRef.current?.();
    };

    return () => source.close();
  }, [accessToken, service, severity, enabled]);
}
