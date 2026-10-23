import axios from 'axios';
import type { ApiFetch } from './api';

export type SignalType = 'logs' | 'metrics' | 'traces';
export type Severity = 'critical' | 'warning' | 'info';

export interface AlertRules {
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

export interface CreateAlertRules {
  service: string;
  signal_type: SignalType;
  metric_name: string;
  aggregation?: string;
  window_seconds: number;
  threshold: number;
  severity: Severity;
  enabled: boolean;
}

export type UpdateAlertRules = Partial<Omit<CreateAlertRules, 'signal_type'>>;

export interface AlertRulesResponse {
  data: AlertRules[];
  hasMore: boolean;
}

export interface AlertRulesParams {
  count?: number;
  offset?: number;
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

async function getAllAlertRules(
  apiFetch: ApiFetch,
  params?: AlertRulesParams,
): Promise<AlertRulesResponse> {
  try {
    const res = await apiFetch<AlertRulesResponse>('/alerts/rules', {
      method: 'GET',
      params,
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to fetch alert rules.');
  }
}

async function addAlertRule(
  apiFetch: ApiFetch,
  alertRule: CreateAlertRules,
): Promise<AlertRules> {
  try {
    const res = await apiFetch<AlertRules>('/alerts/rules', {
      method: 'POST',
      data: alertRule,
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to add alert rule.');
  }
}

async function updateAlertRule(
  apiFetch: ApiFetch,
  id: string,
  changes: UpdateAlertRules,
): Promise<AlertRules> {
  try {
    const res = await apiFetch<AlertRules>(`/alerts/rules/${id}`, {
      method: 'PATCH',
      data: changes,
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to edit alert rule.');
  }
}

async function deleteAlertRule(apiFetch: ApiFetch, id: string): Promise<void> {
  try {
    await apiFetch(`/alerts/rules/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    throw toError(error, 'Unable to delete alert rule.');
  }
}

export { getAllAlertRules, addAlertRule, updateAlertRule, deleteAlertRule };
