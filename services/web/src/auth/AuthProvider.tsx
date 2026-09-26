import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Role } from './authTypes';
import { AuthContext } from './authContext';
import { getCurrentUser, login, refresh, setup } from './authApi';
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
        setAccessToken(null);
        setRole(null);
        clearSessionCookie();
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

  return (
    <AuthContext.Provider value={{ accessToken, role, signIn, signUp, isAuthChecking }}>
      {children}
    </AuthContext.Provider>
  );
}
