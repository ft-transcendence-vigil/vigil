import axios from 'axios';
import type { ApiFetch } from './api';
import type { TlsMode } from '../data/serviceOnboarding';

export interface ConfigKeys {
  api_key: string;
  ingestion_key: string;
}

type VerifiedTlsMode = Exclude<TlsMode, 'unknown'>;

export interface ConfigureTlsAddressResponse {
  address: string;
  configured: boolean;
  status: 'verified' | 'pending';
  tls_mode?: VerifiedTlsMode;
  otlp_endpoint?: string;
  ca_download_url?: string | null;
  code?: string;
  retry_after_seconds?: number;
}

interface ApiError {
  message?: string;
  error?: string;
  code?: string;
}

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error && !axios.isAxiosError(error)) {
    return error;
  }

  if (axios.isAxiosError<ApiError>(error)) {
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

async function getConfigKeys(apiFetch: ApiFetch): Promise<ConfigKeys> {
  try {
    const res = await apiFetch<ConfigKeys>('/config/keys', {
      method: 'GET',
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to fetch config keys.');
  }
}

async function configureTlsAddress(
  apiFetch: ApiFetch,
  address: string,
): Promise<ConfigureTlsAddressResponse> {
  try {
    const res = await apiFetch<ConfigureTlsAddressResponse>(
      '/config/tls/addresses',
      {
        method: 'POST',
        data: {
          address,
        },
      },
    );

    const data = res.data;
    if (data.status === 'verified' && !data.tls_mode) {
      throw new Error('VIGIL verified the address but returned no TLS mode.');
    }
    return data;
  } catch (error) {
    if (axios.isAxiosError<ConfigureTlsAddressResponse>(error)) {
      const data = error.response?.data;
      if (
        error.response?.status === 409 &&
        data?.status === 'verified' &&
        data.tls_mode
      ) {
        return data;
      }
    }
    throw toError(error, 'Unable to configure TLS address.');
  }
}

async function getTlsCa(apiFetch: ApiFetch): Promise<Blob> {
  try {
    const res = await apiFetch<Blob>('/config/tls/ca', {
      method: 'GET',
      responseType: 'blob',
    });
    return res.data;
  } catch (error) {
    throw toError(error, 'Unable to download VIGIL CA certificate.');
  }
}

export { getConfigKeys, configureTlsAddress, getTlsCa };
