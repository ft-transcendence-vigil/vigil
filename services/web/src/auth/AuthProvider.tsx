import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Role } from './authTypes';
import { AuthContext } from './authContext';
import { getCurrentUser, login, logout, refresh, setup } from './authApi';
import {
  clearSessionCookie,
  hasSessionCookie,
  setSessionCookie,
} from './sessionCookie';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(() =>
    hasSessionCookie(),
  );
  const hasStartedAuthCheck = useRef(false);

  const clearAuthState = (): void => {
    setAccessToken(null);
    setRole(null);
    clearSessionCookie();
  };

  useEffect(() => {
    if (hasStartedAuthCheck.current) return;
    hasStartedAuthCheck.current = true;
    if (!hasSessionCookie()) return;
    async function checkAuth() {
      try {
        const data = await refresh();
        const user = await getCurrentUser(data.access_token);
        setAccessToken(data.access_token);
        setRole(user.role);
      } catch {
        clearAuthState();
      } finally {
        setIsAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    const data = await login(email, password);
    setRole(data.role);
    setAccessToken(data.access_token);
    setSessionCookie();
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    const data = await setup(email, password);
    setRole(data.role);
    setAccessToken(data.access_token);
    setSessionCookie();
  };

  const signOut = async (): Promise<void> => {
    try {
      await logout();
    } finally {
      clearAuthState();
    }
  };

  const safeFetch = async (
    url: string,
    options: RequestInit,
  ): Promise<Response> => {
    try {
      return await fetch(url, options);
    } catch {
      throw new Error('Network request failed');
    }
  };

  const withAuth = (options: RequestInit, token: string): RequestInit => {
    return {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    };
  };

  const apiFetch = async (
    url: string,
    options: RequestInit = {},
  ): Promise<Response> => {
    if (!accessToken) throw new Error('No access token available');
    let newOptions: RequestInit = withAuth(options, accessToken);
    let res: Response = await safeFetch(url, newOptions);
    if (res.status === 403) {
      // TODO: change it to 401
      try {
        const data = await refresh();
        setAccessToken(data.access_token);
        newOptions = withAuth(options, data.access_token);
      } catch {
        clearAuthState();
        throw new Error('Session expired');
      }
      res = await safeFetch(url, newOptions);
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        role,
        signIn,
        signUp,
        signOut,
        isAuthChecking,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
