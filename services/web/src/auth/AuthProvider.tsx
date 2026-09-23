import { useState, type ReactNode } from 'react';
import type { Role } from './authTypes';
import { AuthContext } from './authContext';
import { login } from './authApi';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  const signIn = async (email: string, password: string): Promise<void> => {
    const data = await login(email, password);
    setRole(data.role);
    setAccessToken(data.access_token);
  };

  return (
    <AuthContext.Provider value={{ accessToken, role, signIn }}>
      {children}
    </AuthContext.Provider>
  );
}
