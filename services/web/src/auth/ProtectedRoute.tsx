import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './authContext';

export default function ProtectedRoute() {
  const authContext = useContext(AuthContext);
  if (!authContext)
    throw new Error('AuthContext must be used inside AuthProvider');
  if (authContext.isAuthChecking) return null;
  if (!authContext.accessToken) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}
