import axios from 'axios';
import type { ApiFetch } from './api';

export interface Session {
  current: boolean;
  id: string;
  ip_address: string;
  last_used_at: string;
  user_agent: string;
}

export interface AllSessionsResponse {
  sessions: Session[];
}

async function getAllSessions(apiFetch: ApiFetch): Promise<Session[]> {
  try {
    const res = await apiFetch<AllSessionsResponse>('/auth/sessions', {
      method: 'GET',
    });
    return res.data.sessions;
  } catch (error) {
    if (error instanceof Error && !axios.isAxiosError(error)) {
      throw error;
    }
    if (axios.isAxiosError(error)) {
      if (error.response?.data.message) {
        throw new Error(error.response.data.message, { cause: error });
      }
      if (!error.response) {
        throw new Error('Unable to connect to the server.', { cause: error });
      }
    }
    throw new Error('Unable to fetch session.', { cause: error });
  }
}

async function revokeSession(apiFetch: ApiFetch, id: string): Promise<void> {
  try {
    await apiFetch(`/auth/sessions/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data.message) {
        throw new Error(error.response.data.message, { cause: error });
      }
      if (!error.response) {
        throw new Error('Unable to connect to the server.', { cause: error });
      }
    }
    throw new Error('Unable to revoke session.', { cause: error });
  }
}

export { getAllSessions, revokeSession };
