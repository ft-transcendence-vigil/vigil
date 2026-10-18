import type { ReactNode } from 'react';
import { useAuth } from './authContext';
import { Navigate } from 'react-router-dom';
import { isAdmin } from './permissions';

interface Data {
  children: ReactNode;
}

export default function PermissionRoute({ children }: Data) {
  const { user } = useAuth();

  if (!user) return null;
  if (!isAdmin(user.role)) return <Navigate to="/overview" replace />;
  return children;
}
