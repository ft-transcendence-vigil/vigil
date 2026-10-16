import axios from 'axios';
import type { ApiFetch } from './api';

interface ApiKeys {
  api_key: string;
  ingestion_key: string;
}

async function getApiKeys(apiFetch: ApiFetch): Promise<ApiKeys> {
  try {
    const res = await apiFetch<ApiKeys>('/config/keys', {
      method: 'GET',
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message, { cause: error });
      }
      if (!error.response) {
        throw new Error('Unable to connect to the server.', {
          cause: error,
        });
      }
    }
    throw new Error('Unable to fetch config key.', { cause: error });
  }
}

export { getApiKeys };
