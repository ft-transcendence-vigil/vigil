import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { CurrentUser } from '../auth/authTypes';

type ApiFetch = <T = unknown>(
  url: string,
  options: AxiosRequestConfig,
) => Promise<AxiosResponse<T>>;

async function updateEmail(
  apiFetch: ApiFetch,
  email: string,
): Promise<CurrentUser> {
  try {
    const res = await apiFetch<CurrentUser>('/users/me', {
      method: 'PATCH',
      data: {
        email,
      },
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data.message) {
        throw new Error(error.response.data.message, { cause: error });
      }
      if (!error.response) {
        throw new Error('Unable to connect to the server.', { cause: error });
      }
    }
    throw new Error('Unable to update email.', { cause: error });
  }
}

async function changePassword(apiFetch: ApiFetch, password: string) {
  try {
    await apiFetch('/users/me', {
      method: 'PATCH',
      data: {
        password,
      },
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
    throw new Error('Unable to change password.', { cause: error });
  }
}

export { updateEmail, changePassword };
