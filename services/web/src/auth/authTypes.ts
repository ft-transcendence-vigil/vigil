import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { User } from '../api/usersApi';

export type Role = 'admin' | 'viewer';

export interface AuthResponse {
  role: Role;
  access_token: string;
}

export interface ApiError {
  message: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  apiFetch: <T = unknown>(
    url: string,
    options: AxiosRequestConfig,
  ) => Promise<AxiosResponse<T>>;
  isAuthChecking: boolean;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export interface RefreshResponse {
  access_token: string;
}

export interface AlertRulesCurrentUser {
  id: string;
  email: string;
  role: Role;
}

export interface SetupStatusResponse {
  setup_required: boolean;
}
