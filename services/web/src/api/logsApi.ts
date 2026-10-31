import axios from 'axios';
import type { ApiFetch } from './api';
import type { Attributes } from '../components/Logs/LogsRow';

interface Log {
  service: string;
  timestamp: string;
  trace_id: string;
  severity: string;
  message: string;
  attributes: Attributes;
}

interface LogResponse {
  data: Log[];
  hasMore: boolean;
}

export type Period = '1h' | '24h' | '7d' | '30d';

export interface LogsParams {
  period?: Period;
  service?: string;
  severity?: string;
  search?: string;
  sort?: string;
  count?: number;
  before?: string;
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

async function getLogs(
  apiFetch: ApiFetch,
  params: LogsParams = {},
): Promise<LogResponse> {
  try {
    const searchParams = new URLSearchParams();

    if (params.period) searchParams.set('period', params.period);
    if (params.service) searchParams.set('service', params.service);
    if (params.severity) searchParams.set('severity', params.severity);
    if (params.search) searchParams.set('search', params.search);
    if (params.sort) searchParams.set('sort', params.sort);
    if (params.count != undefined) {
      if (
        !Number.isInteger(params.count) ||
        params.count < 1 ||
        params.count > 500
      )
        throw new Error('count must be an integer between 1 and 500');
      searchParams.set('count', params.count.toString());
    }
    if (params.before) searchParams.set('before', params.before);
    if (params.offset != undefined) {
      if (
        !Number.isInteger(params.offset) ||
        params.offset < 0 ||
        params.offset > 500
      )
        throw new Error('offset must be an integer between 0 and 500');
      searchParams.set('offset', params.offset.toString());
    }

    const query = searchParams.toString();

    const res = await apiFetch<LogResponse>(
      `/telemetry/logs${query && `?${query}`}`,
      {
        method: 'GET',
      },
    );
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to fetch logs.');
  }
}

async function exportLogsCsv(
  apiFetch: ApiFetch,
  params: LogsParams = {},
): Promise<Blob> {
  try {
    const searchParams = new URLSearchParams();

    if (params.period) searchParams.set('period', params.period);
    if (params.service) searchParams.set('service', params.service);
    if (params.severity) searchParams.set('severity', params.severity);
    if (params.search) searchParams.set('search', params.search);
    searchParams.set('format', 'csv');

    const query = searchParams.toString();

    const res = await apiFetch<Blob>(`/telemetry/logs?${query}`, {
      method: 'GET',
      responseType: 'blob',
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to export logs.');
  }
}

export { getLogs, exportLogsCsv };
