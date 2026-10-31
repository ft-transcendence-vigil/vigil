import { useEffect, useState } from 'react';
import { useAuth } from '../auth/authContext';
import type { LogsSeverity } from '../components/Logs/LogsRow';
import type { Log } from '../api/logsApi';

interface Data {
  service?: string;
  severity?: LogsSeverity;
  enabled: boolean;
}

export default function useLiveLogs({ service, severity, enabled }: Data) {
  const { accessToken } = useAuth();
  const [liveLogs, setLiveLogs] = useState<Log[]>([]);

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

    source.onopen = () => {
      console.log('connection established');
    };

    source.onmessage = (event) => {
      const log = JSON.parse(event.data);
      setLiveLogs((prev) => [log, ...prev]);
      console.log('new SSE event received', event);
    };

    source.onerror = () => {
      console.log('connection problem');
    };

    return () => source.close();
  }, [accessToken, service, severity, enabled]);

  return { liveLogs };
}
