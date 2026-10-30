import axios from 'axios';
import type { ApiFetch } from './api';

export type Period = '1h' | '24h' | '7d' | '30d';
export type TraceStatus = 'ok' | 'error' | 'unset';

export interface Trace {
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  name: string;
  service: string;
  timestamp: string;
  duration_ms: number;
  status: TraceStatus;
  attributes: Record<string, string>;
}

export interface TracesResponse {
  data: Trace[];
  hasMore: boolean;
}

export interface TracesParams {
  period?: Period;
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

async function getTraces(
  apiFetch: ApiFetch,
  params?: TracesParams,
): Promise<TracesResponse> {
  try {
    const res = await apiFetch<TracesResponse>('/telemetry/traces', {
      method: 'GET',
      params,
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to fetch traces.');
  }
}

async function exportTracesCsv(
  apiFetch: ApiFetch,
  params: Pick<TracesParams, 'period' | 'service'>,
): Promise<Blob> {
  try {
    const res = await apiFetch<Blob>('/telemetry/traces', {
      method: 'GET',
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to export traces.');
  }
}

export { getTraces, exportTracesCsv };
