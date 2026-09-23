export type Role = 'admin' | 'viewer';

export interface AuthResponse {
  role: Role;
  access_token: string;
}

export interface ApiError {
  error: string;
}

export interface AuthState {
  role: Role | null;
  accessToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
}
