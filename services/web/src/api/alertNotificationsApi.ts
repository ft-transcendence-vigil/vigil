import axios from 'axios';
import type { ApiFetch } from './api';

export interface AlertNotification {
  alert_history_id: string;
  service: string;
  triggered_at: string;
  signal_type: 'logs' | 'metrics' | 'traces' | null;
  severity: 'info' | 'warning' | 'critical';
  seen: boolean;
  seen_at: string | null;
}

export interface AlertNotificationsResponse {
  notifications: AlertNotification[];
  has_more: boolean;
}

export interface AlertNotificationsParams {
  count?: number;
  before?: string;
}

export interface UpdateAlertNotificationResponse {
  alert_id: string;
  seen: boolean;
  seen_at: string | null;
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

async function getAlertNotifications(
  apiFetch: ApiFetch,
  params?: AlertNotificationsParams,
): Promise<AlertNotificationsResponse> {
  try {
    const res = await apiFetch<AlertNotificationsResponse>(
      '/alerts/notifications',
      {
        method: 'GET',
        params,
      },
    );
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to fetch alert notifications.');
  }
}

async function updateAlertNotificationSeen(
  apiFetch: ApiFetch,
  historyId: string,
  seen: boolean,
): Promise<UpdateAlertNotificationResponse> {
  try {
    const res = await apiFetch<UpdateAlertNotificationResponse>(
      `/alerts/notifications/${historyId}`,
      {
        method: 'PUT',
        params: {
          seen,
        },
      },
    );
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to update alert notification.');
  }
}

export { getAlertNotifications, updateAlertNotificationSeen };
