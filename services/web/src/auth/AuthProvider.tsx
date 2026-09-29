import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Role } from './authTypes';
import { AuthContext } from './authContext';
import { getCurrentUser, login, logout, refresh, setup } from './authApi';
import {
  clearSessionCookie,
  hasSessionCookie,
  setSessionCookie,
} from './sessionCookie';
import api from '../api/api';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

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

  const requestWithToken = <T,>(
    token: string,
    url: string,
    options: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> => {
    return api.request<T>({
      ...options,
      url,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const apiFetch = async <T = unknown,>(
    url: string,
    options: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> => {
    if (!accessToken) throw new Error('No access token available');
    try {
      return await requestWithToken<T>(accessToken, url, options);
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401)
        throw error;
    }
    try {
      const data = await refresh();
      setAccessToken(data.access_token);
      return await requestWithToken<T>(data.access_token, url, options);
    } catch (refreshError) {
      clearAuthState();
      throw new Error('Session expired', { cause: refreshError });
    }
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
