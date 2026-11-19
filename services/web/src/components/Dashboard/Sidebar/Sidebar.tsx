import { Link } from 'react-router-dom';
import { useAuth } from '../../../auth/authContext';
import Logo from '../../shared/Logo';
import SidebarSection from './SidebarSection';
import { dashboardNavigation as sidebarSections } from './dashboardNavigation';
import type { AlertsStreamStatus } from '../../../hooks/useAlertsWebSocket';

interface Data {
  status: AlertsStreamStatus;
  onRetry: () => void;
}

export default function Sidebar({ status, onRetry }: Data) {
  const { user } = useAuth();

  return (
    <div className="sidebar h-screen bg-vigil-surface w-50 md:w-65 py-3 md:py-4 border-r border-r-vigil-border flex flex-col">
      <Logo className="md:text-2xl px-4 md:px-5 mx-auto!" />
      <div className="sidebar-items border-y border-y-vigil-border py-4 my-4 flex-1">
        {sidebarSections.map((section) => (
          <SidebarSection
            key={section.title}
            title={section.title}
            links={section.links}
          />
        ))}
      </div>
      <div className="footer px-3 text-[8px] md:text-[10px]">
        <div className="client-info flex justify-between items-center flex-wrap">
          <h6
            className="client-mail text-vigil-text-subtle truncate"
            title={user?.email}
          >
            {user?.email}
          </h6>
          <h6 className="flex justify-center items-center font-bold client-role text-[7px] md:text-[8px] bg-vigil-accent-badge uppercase px-1 py-0.5 text-vigil-accent border">
            {user?.role}
          </h6>
        </div>
        <div className="ws-stream mt-1 flex items-center gap-2 text-[10px] md:text-[11px]">
          <p
            className={
              {
                connecting: 'text-vigil-muted',
                connected: 'text-vigil-success',
                disconnected: 'text-vigil-state-danger',
              }[status]
            }
          >
            <span className="me-1 inline-block h-1.5 w-1.5 rounded bg-current" />
            Alerts stream {status}
            {status === 'connecting' ? '…' : ''}
          </p>
          {status === 'disconnected' && (
            <button
              type="button"
              onClick={onRetry}
              className="underline cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
        <Link
          to="/legal"
          target="_blank"
          className="text-[10px] text-vigil-muted hover:text-vigil-state-muted-text block mt-2"
        >
          Privacy · Terms
        </Link>
      </div>
    </div>
  );
}
