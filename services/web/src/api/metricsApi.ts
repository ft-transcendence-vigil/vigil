import axios from 'axios';
import type { ApiFetch } from './api';

export type Period = '1h' | '24h' | '7d' | '30d';
export type MetricKind = 'gauge' | 'counter' | 'histogram';

export interface Metric {
  service: string;
  timestamp: string;
  name: string;
  // null for histogram points, which have no single value
  value: number | null;
  attributes: Record<string, string>;
}

export interface MetricsResponse {
  data: Metric[];
  hasMore: boolean;
}

export interface MetricsParams {
  period?: Period;
  service?: string;
  count?: number;
  before?: string;
}

export interface MetricPoint {
  bucket: string;
  value: number | null;
}

export interface MetricSeries {
  name: string;
  service: string;
  unit: string;
  kind: MetricKind;
  points: MetricPoint[];
}

export interface MetricSeriesResponse {
  interval_seconds: number;
  series: MetricSeries[];
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

async function getMetrics(
  apiFetch: ApiFetch,
  params?: MetricsParams,
): Promise<MetricsResponse> {
  try {
    const res = await apiFetch<MetricsResponse>('/telemetry/metrics', {
      method: 'GET',
      params,
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to fetch metrics.');
  }
}

async function getMetricSeries(
  apiFetch: ApiFetch,
  params: Pick<MetricsParams, 'period' | 'service'>,
): Promise<MetricSeriesResponse> {
  try {
    const res = await apiFetch<MetricSeriesResponse>(
      '/telemetry/metrics/series',
      { method: 'GET', params },
    );
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to fetch metric series.');
  }
}

async function exportMetricsCsv(
  apiFetch: ApiFetch,
  params: Pick<MetricsParams, 'period' | 'service'>,
): Promise<Blob> {
  try {
    const res = await apiFetch<Blob>('/telemetry/metrics', {
      method: 'GET',
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to export metrics.');
  }
}

export { getMetrics, getMetricSeries, exportMetricsCsv };
