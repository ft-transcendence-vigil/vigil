import { useAuth } from './authContext';
import { Navigate, Outlet } from 'react-router-dom';

export default function PublicOnlyRoute() {
  const auth = useAuth();

  if (auth.isAuthChecking) return null;
  if (auth.accessToken) return <Navigate to="/overview" replace />;
  return <Outlet />;
}
