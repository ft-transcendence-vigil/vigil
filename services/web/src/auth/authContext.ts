import { createContext, useContext } from 'react';
import type { AuthState } from './authTypes';

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) throw new Error('AuthContext must be used inside AuthProvider');
  return context;
}
