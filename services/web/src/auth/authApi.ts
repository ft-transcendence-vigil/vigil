import axios from 'axios';
import api from '../api/api';
import type { AuthResponse, CurrentUser, RefreshResponse } from './authTypes';

async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
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
    throw new Error('Unable to log in.', { cause: error });
  }
}

async function setupInitialAdmin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  try {
    const res = await api.post<AuthResponse>('/setup', {
      email,
      password,
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
    throw new Error('Unable to complete setup.', { cause: error });
  }
}

async function checkSetup(): Promise<boolean> {
  try {
    const res = await api.get<boolean>('/setup');
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
    throw new Error('Unable to complete setup.', { cause: error });
  }
}

async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new Error('Unable to connect to the server.', { cause: error });
      }
    }
    throw new Error('Unable to logout.', { cause: error });
  }
}

async function getCurrentUser(accessToken: string): Promise<CurrentUser> {
  try {
    const res = await api.get<CurrentUser>('/users/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new Error('Unable to connect to the server.', { cause: error });
      }
    }
    throw new Error('Unable to get current user.', { cause: error });
  }
}

async function refresh(): Promise<RefreshResponse> {
  try {
    const res = await api.post<RefreshResponse>('/auth/refresh');
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new Error('Unable to connect to the server.', { cause: error });
      }
    }
    throw new Error('Unable to refresh session.', { cause: error });
  }
}

export {
  login,
  logout,
  getCurrentUser,
  refresh,
  setupInitialAdmin,
  checkSetup,
};
