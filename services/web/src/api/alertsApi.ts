import axios from 'axios';
import type { ApiFetch } from './api';
import type { Severity, SignalType } from './alertRulesApi';

export type AlertStatus = 'sent' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  rule_id: string;
  service: string;
  signal_type: SignalType;
  metric_name: string;
  aggregation: string | null;
  window_seconds: number;
  threshold: number | null;
  severity: Severity;
  triggered_at: string;
  llm_analysis: string | null;
  status: AlertStatus;
  acked_at?: string;
  resolved_at?: string;
  acked_by?: string;
  resolved_by?: string;
}

export interface AlertsResponse {
  data: Alert[];
  hasMore: boolean;
}

export interface AlertsParams {
  period?: '1h' | '24h' | '7d' | '30d';
  service?: string;
  count?: number;
  before?: string;
}

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const body = error.response?.data;
    const message = body?.message ?? body?.error;

    if (typeof message === 'string' && message) {
      return new Error(message, { cause: error });
    }

    if (!error.response) {
      return new Error('Unable to connect to the server.', { cause: error });
    }
  }
  return new Error(fallback, { cause: error });
}

async function getAlerts(
  apiFetch: ApiFetch,
  params?: AlertsParams,
): Promise<AlertsResponse> {
  try {
    const res = await apiFetch<AlertsResponse>('/alerts', {
      method: 'GET',
      params,
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to fetch alerts.');
  }
}

export { getAlerts };
