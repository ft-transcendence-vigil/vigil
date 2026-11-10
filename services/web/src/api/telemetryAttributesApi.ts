import axios from 'axios';
import type { ApiFetch } from './api';

export interface TelemetryAttribute {
  key: string;
  values: string[];
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

async function getTelemetryAttributes(
  apiFetch: ApiFetch,
): Promise<TelemetryAttribute[]> {
  try {
    const res = await apiFetch<TelemetryAttribute[]>('/telemetry/attributes', {
      method: 'GET',
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to fetch telemetry attributes.');
  }
}

export { getTelemetryAttributes };
