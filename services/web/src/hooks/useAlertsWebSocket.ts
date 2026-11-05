import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/authContext';
import type { AlertHistory } from '../api/alertHistoryApi';
import type { AlertNotification } from '../api/alertNotificationsApi';

type WsAlertHistory = Omit<AlertHistory, 'id'> & {
  alert_history_id: string;
};

export type LlmUpdate = {
  id: string;
  status: string;
  llm_analysis: string;
};

type AlertWsFrame =
  | { type: 'alert'; data: WsAlertHistory }
  | { type: 'Notification'; data: AlertNotification }
  | { type: 'llm'; data: LlmUpdate }
  | { type: 'error'; message: string };

interface Data {
  onAlert: (alert: AlertHistory) => void;
  onLlm: (data: LlmUpdate) => void;
  onServerError: (message: string) => void;
  onReconnect: () => void;
  onNotification: (notification: AlertNotification) => void;
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
  onNotification,
}: Data) {
  const { accessToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const onAlertRef = useRef(onAlert);
  const onLlmRef = useRef(onLlm);
  const onServerErrorRef = useRef(onServerError);
  const onReconnectRef = useRef(onReconnect);
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onAlertRef.current = onAlert;
    onLlmRef.current = onLlm;
    onServerErrorRef.current = onServerError;
    onReconnectRef.current = onReconnect;
    onNotificationRef.current = onNotification;
  }, [onAlert, onLlm, onServerError, onReconnect, onNotification]);

  useEffect(() => {
    if (!accessToken) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    let attempt = 0;
    let hasConnected = false;

    const connect = () => {
      ws = new WebSocket(
        `/api/alerts/ws?token=${encodeURIComponent(accessToken)}`,
      );

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
        let frame: AlertWsFrame;

        try {
          frame = JSON.parse(event.data) as AlertWsFrame;
        } catch {
          // Ignore malformed frames.
          return;
        }

        switch (frame.type) {
          case 'alert':
            onAlertRef.current(normalizeWsAlert(frame.data));
            break;
          case 'Notification':
            onNotificationRef.current(frame.data);
            break;
          case 'llm':
            onLlmRef.current(frame.data);
            break;
          case 'error':
            onServerErrorRef.current(frame.message);
            break;
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
