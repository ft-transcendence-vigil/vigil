import type { ApiError, AuthResponse } from './authTypes';

async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const errorData: ApiError = await response.json();
    throw new Error(errorData.error);
  }
  const data: AuthResponse = await response.json();
  return data;
}

export { login };
