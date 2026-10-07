import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { checkSetup } from './authApi';
import { useEffect, useRef, useState } from 'react';
import SetupCheckError from '../pages/errors/SetupCheckError';

export default function SetupGuard() {
  const [isChecking, setIsChecking] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [hasError, setHasError] = useState(false);
  const hasStartedSetupCheck = useRef(false);
  const location = useLocation();

  useEffect(() => {
    if (hasStartedSetupCheck.current) return;
    hasStartedSetupCheck.current = true;
    async function checkSetupStatus() {
      try {
        const isComplete = await checkSetup();
        setIsSetupComplete(isComplete);
      } catch {
        setHasError(true);
      } finally {
        setIsChecking(false);
      }
    }
    checkSetupStatus();
  }, []);
  if (isChecking) return null;
  if (hasError) return <SetupCheckError />;
  if (isSetupComplete && location.pathname === '/auth/setup')
    return <Navigate to="/auth/login" replace />;
  if (!isSetupComplete && location.pathname === '/auth/login')
    return <Navigate to="/auth/setup" replace />;
  return <Outlet />;
}
