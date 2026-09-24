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
}
