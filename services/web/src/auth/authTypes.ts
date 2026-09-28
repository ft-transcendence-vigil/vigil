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
  apiFetch: (url: string, options: ResponseInit) => Promise<Response>;
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
