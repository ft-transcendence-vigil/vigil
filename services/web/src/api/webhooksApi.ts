import axios from 'axios';
import type { ApiFetch } from './api';

interface webhookResponse {
  id: string;
  url: string;
}

async function getAllWebhooks(apiFetch: ApiFetch): Promise<webhookResponse[]> {
  try {
    const res = await apiFetch<webhookResponse[]>('/webhooks', {
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
    throw new Error('Unable to fetch webhooks.', { cause: error });
  }
}

async function addWebhook(
  apiFetch: ApiFetch,
  url: string,
): Promise<webhookResponse> {
  try {
    const res = await apiFetch<webhookResponse>('/webhooks', {
      method: 'POST',
      data: { url },
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
    throw new Error('Unable to add webhook.', { cause: error });
  }
}

async function deleteWebhook(apiFetch: ApiFetch, id: string): Promise<void> {
  try {
    await apiFetch<void>(`/webhooks/${id}`, {
      method: 'DELETE',
    });
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
    throw new Error('Unable to delete webhook.', { cause: error });
  }
}

export { getAllWebhooks, addWebhook, deleteWebhook };
