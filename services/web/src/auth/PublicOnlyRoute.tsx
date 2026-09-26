import { useContext } from 'react';
import { AuthContext } from './authContext';
import { Navigate, Outlet } from 'react-router-dom';

export default function PublicOnlyRoute() {
  const auth = useContext(AuthContext);

  if (!auth) throw new Error('AuthContext must be used inside AuthProvider');
  if (auth.isAuthChecking) return null;
  if (auth.accessToken) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
