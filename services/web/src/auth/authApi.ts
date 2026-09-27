import type {
  ApiError,
  AuthResponse,
  CurrentUser,
  RefreshResponse,
} from './authTypes';

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'PassTest42!';
const SETUP_ALREADY_COMPLETED = 'SETUP_ALREADY_COMPLETED';

async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errorData: ApiError = await res.json().catch(() => null);
    throw new Error(
      errorData?.error.message ?? 'Unable to connect to the server.',
    );
  }
  const data: AuthResponse = await res.json();
  return data;
}

async function setup(
  email: string = TEST_EMAIL,
  password: string = TEST_PASSWORD,
): Promise<AuthResponse> {
  const res = await fetch('/api/auth/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const errorData: ApiError = await res.json().catch(() => null);
    if (res.status === 409) throw new Error(SETUP_ALREADY_COMPLETED); // TODO: should get auth/setup (after moel fix it)
    throw new Error(
      errorData?.error.message ?? 'Unable to connect to the server.',
    );
  }
  const data: AuthResponse = await res.json();
  return data;
}

async function logout(): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to logout: ${res.status}`);
}

async function getCurrentUser(accessToken: string): Promise<CurrentUser> {
  const res = await fetch('/api/users/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to get current user: ${res.status}`);
  const user: CurrentUser = await res.json();
  return user;
}

async function refresh(): Promise<RefreshResponse> {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`Failed to refresh access token: ${res.status}`);
  const data: RefreshResponse = await res.json();
  return data;
}

export {
  login,
  logout,
  getCurrentUser,
  refresh,
  setup,
  SETUP_ALREADY_COMPLETED,
};
