import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export type Role = 'admin' | 'viewer';

export interface AuthResponse {
  role: Role;
  access_token: string;
}

export interface ApiError {
  status: number;
  path: string;
  error: {
    message: string;
  };
  timestamp: string;
}

export interface AuthState {
  role: Role | null;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  apiFetch: <T = unknown>(
    url: string,
    options: AxiosRequestConfig,
  ) => Promise<AxiosResponse<T>>;
  isAuthChecking: boolean;
}

export interface RefreshResponse {
  access_token: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
}
