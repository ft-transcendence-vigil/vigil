import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './authContext';

export default function ProtectedRoute() {
  const auth = useAuth();

  if (auth.isAuthChecking) return null;
  if (!auth.accessToken) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}
