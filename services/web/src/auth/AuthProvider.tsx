import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { CurrentUser } from './authTypes';
import { AuthContext } from './authContext';
import {
  getCurrentUser,
  login,
  logout,
  refresh,
  setupInitialAdmin,
} from '../api/authApi';
import api from '../api/api';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { hasRefreshHint } from './refreshHint';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(() => hasRefreshHint());
  const navigate = useNavigate();

  const clearAuthState = useCallback((): void => {
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!hasRefreshHint()) return;
    async function checkAuth() {
      try {
        const data = await refresh();
        const user = await getCurrentUser(data.access_token);
        setAccessToken(data.access_token);
        setUser(user);
      } catch {
        clearAuthState();
      } finally {
        setIsAuthChecking(false);
      }
    }
    checkAuth();
  }, [clearAuthState]);

  const signIn = async (email: string, password: string): Promise<void> => {
    const data = await login(email, password);
    const currentUser = await getCurrentUser(data.access_token);
    setAccessToken(data.access_token);
    setUser(currentUser);
  };

  const signUp = async (email: string, password: string): Promise<void> => {
    const data = await setupInitialAdmin(email, password);
    const currentUser = await getCurrentUser(data.access_token);
    setAccessToken(data.access_token);
    setUser(currentUser);
  };

  const signOut = async (): Promise<void> => {
    try {
      await logout();
    } catch {
      // Ignore server logout failure.
    } finally {
      clearAuthState();
      navigate('/auth/login', { replace: true });
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

  const apiFetch = useCallback(
    async <T = unknown,>(
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
    },
    [accessToken, clearAuthState],
  );

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        signIn,
        signUp,
        signOut,
        isAuthChecking,
        apiFetch,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
