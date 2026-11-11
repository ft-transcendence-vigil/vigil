import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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
import type { User } from '../api/usersApi';
import { useQueryClient } from '@tanstack/react-query';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(() => hasRefreshHint());
  const navigate = useNavigate();
  const refreshing = useRef<ReturnType<typeof refresh> | null>(null);
  const queryClient = useQueryClient();
  const [authCheckError, setAuthCheckError] = useState(false);

  const clearAuthState = useCallback((): void => {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const refreshOnce = useCallback(() => {
    if (!refreshing.current) {
      refreshing.current = refresh().finally(() => {
        refreshing.current = null;
      });
    }
    return refreshing.current;
  }, []);

  useEffect(() => {
    if (!hasRefreshHint()) return;
    async function checkAuth() {
      try {
        const data = await refreshOnce();
        const user = await getCurrentUser(data.access_token);
        setAccessToken(data.access_token);
        setUser(user);
      } catch (error) {
        const originalError =
          error instanceof Error ? (error.cause ?? error) : error;

        if (
          axios.isAxiosError(originalError) &&
          originalError.response?.status === 401
        ) {
          clearAuthState();
        } else {
          setAuthCheckError(true);
        }
      } finally {
        setIsAuthChecking(false);
      }
    }
    checkAuth();
  }, [clearAuthState, refreshOnce]);

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
      let data;

      try {
        data = await refreshOnce();
      } catch (refreshError) {
        const originalError =
          refreshError instanceof Error
            ? (refreshError.cause ?? refreshError)
            : refreshError;
        if (
          axios.isAxiosError(originalError) &&
          originalError.response?.status === 401
        ) {
          clearAuthState();
          throw new Error('Session expired', { cause: refreshError });
        }
        throw new Error('Unable to refresh session. Please try again.', {
          cause: refreshError,
        });
      }
      setAccessToken(data.access_token);
      return requestWithToken<T>(data.access_token, url, options);
    },
    [accessToken, clearAuthState, refreshOnce],
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
        authCheckError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
