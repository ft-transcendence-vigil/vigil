import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/authContext';
import type { LogsSeverity } from '../components/Logs/LogsRow';
import type { Log } from '../api/logsApi';
import type { LiveLogsStatus } from '../pages/Logs/LogsPage';

interface Data {
  service?: string;
  severity?: LogsSeverity;
  enabled: boolean;
  onLog: (log: Log) => void;
  onError?: () => void;
  setConnectionStatus: (value: LiveLogsStatus) => void;
}

export default function useLiveLogs({
  service,
  severity,
  enabled,
  onLog,
  onError,
  setConnectionStatus,
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
    if (!accessToken || !enabled) {
      setConnectionStatus('paused');
      return;
    }

    setConnectionStatus('connecting...');
    const params = new URLSearchParams({
      token: accessToken,
    });
    if (service) params.set('service', service);
    if (severity) params.set('severity', severity);

    const source = new EventSource(
      `/api/telemetry/logs/live?${params.toString()}`,
    );

    source.onopen = () => {
      setConnectionStatus('live');
    };

    source.onmessage = (event) => {
      try {
        const log = JSON.parse(event.data);
        onLogRef.current(log);
      } catch {
        return;
      }
    };

    source.onerror = () => {
      setConnectionStatus('paused');
      source.close();
      onErrorRef.current?.();
    };

    return () => source.close();
  }, [accessToken, service, severity, enabled, setConnectionStatus]);
}
