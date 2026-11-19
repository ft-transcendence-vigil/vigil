import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/authContext';
import type { AlertHistory } from '../api/alertHistoryApi';
import type { AlertNotification } from '../api/alertNotificationsApi';

export type AlertsStreamStatus = 'connecting' | 'connected' | 'disconnected';

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
  const [status, setStatus] = useState<AlertsStreamStatus>('connecting');
  const [retryVersion, setRetryVersion] = useState(0);
  const showConnectingUntil = useRef(0);
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
    let stopped = false;
    let statusTimer: number | undefined;

    const showResult = (result: 'connected' | 'disconnected') => {
      window.clearTimeout(statusTimer);
      const remaining = showConnectingUntil.current - Date.now();

      if (remaining <= 0) {
        setStatus(result);
        return;
      }

      statusTimer = window.setTimeout(() => setStatus(result), remaining);
    };
    const connect = () => {
      ws = new WebSocket(
        `/api/alerts/ws?token=${encodeURIComponent(accessToken)}`,
      );

      ws.onopen = () => {
        if (stopped) return;
        showResult('connected');
        onReconnectRef.current();
      };

      ws.onclose = () => {
        if (stopped) return;
        showResult('disconnected');
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
      window.clearTimeout(statusTimer);
      ws?.close();
    };
  }, [accessToken, retryVersion]);

  const retry = () => {
    if (!accessToken || status != 'disconnected') return;

    showConnectingUntil.current = Date.now() + 1000;
    setStatus('connecting');
    setRetryVersion((current) => current + 1);
  };

  return {
    isConnected: status === 'connected',
    status,
    retry,
  };
}
