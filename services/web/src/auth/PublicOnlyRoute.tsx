import { useAuth } from './authContext';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function PublicOnlyRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isAuthChecking) return null;

  if (auth.accessToken) {
    if (location.pathname === '/auth/setup') {
      return <Navigate to="/service-onboarding" replace />;
    }

    return <Navigate to="/overview" replace />;
  }

  return <Outlet />;
}
