import type { AlertHistory } from '../api/alertHistoryApi';
import type { LlmUpdate } from '../hooks/useAlertsWebSocket';

type AlertListener = (alert: AlertHistory) => void;
type LlmListener = (data: LlmUpdate) => void;

let alertListener: AlertListener | null = null;
let llmListener: LlmListener | null = null;

export function subscribeToAlerts(listener: AlertListener) {
  alertListener = listener;

  return () => {
    alertListener = null;
  };
}

export function subscribeToLlm(listener: LlmListener) {
  llmListener = listener;

  return () => {
    llmListener = null;
  };
}

export function emitAlert(alert: AlertHistory) {
  alertListener?.(alert);
}

export function emitLlm(data: LlmUpdate) {
  llmListener?.(data);
}
