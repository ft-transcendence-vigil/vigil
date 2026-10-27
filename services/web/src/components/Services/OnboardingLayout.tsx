import { Outlet } from 'react-router-dom';
import Logo from '../shared/Logo';
import { useAuth } from '../../auth/authContext';

export default function OnboardingLayout() {
  const { user } = useAuth();

  return (
    <div className="dashboard-bg flex h-dvh flex-col overflow-hidden bg-vigil-bg">
      <header className="flex py-4 shrink-0 items-center justify-between px-5 sm:px-8 border-b border-b-vigil-border">
        <Logo className="md:text-2xl px-4 md:px-5 m-0!" />
        <div className="flex space-x-3 items-center">
          <h1 className="text-vigil-muted uppercase text-[10px] md:text-[13px] tracking-wider">
            {user?.email ?? ''}
          </h1>
          <h6 className="tracking-wider flex justify-center items-center font-bold client-role text-[7px] md:text-[9px] bg-[#2195f310] uppercase px-1 py-0.5 text-vigil-blue border">
            {user?.role ?? ''}
          </h6>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden pb-9 pt-5">
        <Outlet />
      </main>
    </div>
  );
}
