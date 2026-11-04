import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/authContext';
import type { AlertHistory } from '../api/alertHistoryApi';

type WsAlertHistory = Omit<AlertHistory, 'id'> & {
  alert_history_id: string;
};

type WsNotification = {
  alert_history_id: string;
  service: string;
  triggered_at: string;
  signal_type: 'logs' | 'metrics' | 'traces' | null;
  severity: 'info' | 'warning' | 'critical';
  seen: boolean;
  seen_at: string | null;
};

export type LlmUpdate = {
  id: string;
  status: string;
  llm_analysis: string;
};

type AlertWsFrame =
  | { type: 'alert'; data: WsAlertHistory }
  | { type: 'Notification'; data: WsNotification }
  | { type: 'llm'; data: LlmUpdate }
  | { type: 'error'; message: string };

interface Data {
  onAlert: (alert: AlertHistory) => void;
  onLlm: (data: LlmUpdate) => void;
  onServerError: (message: string) => void;
  onReconnect: () => void;
}

function normalizeWsAlert(data: WsAlertHistory): AlertHistory {
  const { alert_history_id, ...rest } = data;

  return {
    ...rest,
    id: alert_history_id,
  };
}

export default function useAlertsWebSocket({
  onAlert,
  onLlm,
  onServerError,
  onReconnect,
}: Data) {
  const { accessToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const onAlertRef = useRef(onAlert);
  const onLlmRef = useRef(onLlm);
  const onServerErrorRef = useRef(onServerError);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onAlertRef.current = onAlert;
    onLlmRef.current = onLlm;
    onServerErrorRef.current = onServerError;
    onReconnectRef.current = onReconnect;
  }, [onAlert, onLlm, onServerError, onReconnect]);

  useEffect(() => {
    if (!accessToken) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let attempt = 0;
    let hasConnected = false;

    const connect = () => {
      ws = new WebSocket(`/api/alerts/ws?token=${encodeURIComponent(accessToken)}`);

      ws.onopen = () => {
        setIsConnected(true);
        attempt = 0;
        if (hasConnected) {
          onReconnectRef.current();
        }
        hasConnected = true;
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (stopped) return;
        attempt++;
        const delay = Math.min(1000 * 2 ** attempt, 15000);
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onmessage = (event) => {
        try {
          const frame = JSON.parse(event.data) as AlertWsFrame;

          switch (frame.type) {
            case 'alert':
              onAlertRef.current(normalizeWsAlert(frame.data));
              break;
            case 'Notification':
              break;
            case 'llm':
              onLlmRef.current(frame.data);
              break;
            case 'error':
              onServerErrorRef.current(frame.message);
              break;
          }
        } catch {
          // Ignore malformed frames.
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [accessToken]);

  return {
    isConnected,
  };
}
