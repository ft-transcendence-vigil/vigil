import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { setup, SETUP_ALREADY_COMPLETED } from './authApi';
import { useEffect, useRef, useState } from 'react';

export default function SetupGuard() {
  const [isChecking, setIsChecking] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const hasStartedSetupCheck = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (hasStartedSetupCheck.current) return;
    hasStartedSetupCheck.current = true;
    async function checkSetupStatus() {
      try {
        await setup(); // TODO: follow /auth/setup GET
      } catch (error) {
        if (error instanceof Error && error.message === SETUP_ALREADY_COMPLETED)
          setIsSetupComplete(true);
      } finally {
        setIsChecking(false);
      }
    }
    checkSetupStatus();
  }, []);
  if (isChecking) return null;
  if (isSetupComplete && location.pathname === '/auth/setup')
    return <Navigate to="/auth/login" replace />;
  if (!isSetupComplete && location.pathname === '/auth/login')
    return <Navigate to="/auth/setup" replace />;
  return <Outlet />;
}
