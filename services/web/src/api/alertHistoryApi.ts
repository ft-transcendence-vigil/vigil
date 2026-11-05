import axios from 'axios';
import type { ApiFetch } from './api';
import type { Severity, SignalType } from './alertRulesApi';

export type AlertStatus = 'sent' | 'acknowledged' | 'resolved';

export interface AlertHistoryRule {
  id: string;
  service: string;
  signal_type: SignalType;
  metric_name: string;
  aggregation: string | null;
  window_seconds: number;
  threshold: number;
  severity: Severity;
  enabled: boolean;
  is_default: boolean;
}

export interface AlertHistory {
  id: string;
  rule_id: string | null;
  rule: AlertHistoryRule | null;
  service: string;
  signal_type: SignalType | null;
  metric_name: string;
  aggregation: string | null;
  window_seconds: number | null;
  threshold: number | null;
  severity: Severity;
  triggered_at: string;
  llm_analysis: string | null;
  status: AlertStatus;
  owner_id: string | null;
  acked_at: string | null;
  acked_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  version: number;
}

export interface AlertHistoryResponse {
  data: AlertHistory[];
  has_more?: boolean;
  hasMore?: boolean; // TODO: check from new response
}

export interface AlertHistoryParams {
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
      return new Error(message, {
        cause: error,
      });
    }
    if (!error.response) {
      return new Error('Unable to connect to the server.', {
        cause: error,
      });
    }
  }
  return new Error(fallback, {
    cause: error,
  });
}

export async function getAlertHistory(
  apiFetch: ApiFetch,
  params?: AlertHistoryParams,
): Promise<AlertHistoryResponse> {
  try {
    const res = await apiFetch<AlertHistoryResponse>('/alerts', {
      method: 'GET',
      params,
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to fetch alerts.');
  }
}

export async function updateAlertStatus(
  apiFetch: ApiFetch,
  id: string,
  status: AlertStatus,
): Promise<void> {
  try {
    await apiFetch<AlertHistory>(`/alerts/history/${id}?status=${status}`, {
      method: 'PATCH',
    });
  } catch (error) {
    throw toError(error, 'Unable to edit alerts status.');
  }
}
