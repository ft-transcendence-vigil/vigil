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
//unknown we dont know the error yet fallback if we dont find a fitting message
function toError(error: unknown, fallback: string): Error {
  //is it an error from exceptions return it
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    //? here means if response is empty stop and give undifineed instead of crashing
    const body = error.response?.data;
    // use left if its empty use right
    const message = body?.message ?? body?.error;
    //we check if error has is a string and is filled 
    if (typeof message === 'string' && message) {
      return new Error(message, { cause: error });
    }
    //http response didnt come 
    if (!error.response) {
      return new Error('Unable to connect to the server.', { cause: error });
    }
  }
  //fallback if no string error exists
  return new Error(fallback, { cause: error });
}
//func that calls endpoint to get the traces
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
  //describes what params is allowed to to have so only period and service
  //Blob raw byte plus type of file and size promise cose the function is async we return it later
  params: Pick<TracesParams, 'period' | 'service'>,
): Promise<Blob> {
  try {
    const res = await apiFetch<Blob>('/telemetry/traces', {
      method: 'GET',
      //... copies everything in an object to new one then we add format: 'csv' to it
      params: { ...params, format: 'csv' },
      responseType: 'blob',
    });
    //return the blob
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to export traces.');
  }
}

export { getTraces, exportTracesCsv };
