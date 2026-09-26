import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './authContext';

export default function ProtectedRoute() {
  const auth = useContext(AuthContext);
  if (!auth)
    throw new Error('AuthContext must be used inside AuthProvider');
  if (auth.isAuthChecking) return null;
  if (!auth.accessToken) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}
