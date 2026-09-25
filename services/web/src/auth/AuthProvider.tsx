import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Role } from './authTypes';
import { AuthContext } from './authContext';
import { getCurrentUser, login, refresh } from './authApi';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const hasStartedAuthCheck = useRef(false);

  useEffect(() => {
    if (hasStartedAuthCheck.current) return;
    hasStartedAuthCheck.current = true;
    async function checkAuth() {
      try {
        const data = await refresh();
        const user = await getCurrentUser(data.access_token);
        setAccessToken(data.access_token);
        setRole(user.role);
      } catch {
        setAccessToken(null);
        setRole(null);
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
  };

  return (
    <AuthContext.Provider value={{ accessToken, role, signIn, isAuthChecking }}>
      {children}
    </AuthContext.Provider>
  );
}
