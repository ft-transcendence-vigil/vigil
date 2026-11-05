import { Link } from 'react-router-dom';
import { useAuth } from '../../../auth/authContext';
import Logo from '../../shared/Logo';
import SidebarSection from './SidebarSection';
import { dashboardNavigation as sidebarSections } from './dashboardNavigation';

interface Data {
  isConnected: boolean;
}

export default function Sidebar({ isConnected }: Data) {
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
            className="client-mail text-[#ffffffd0] truncate"
            title={user?.email}
          >
            {user?.email}
          </h6>
          <h6 className="flex justify-center items-center font-bold client-role text-[7px] md:text-[8px] bg-[#2195f310] uppercase px-1 py-0.5 text-vigil-blue border">
            {user?.role}
          </h6>
        </div>
        <p
          className={`ws-stream mt-1 text-[10px] md:text-[11px] tracking-wider ${
            isConnected ? 'text-[#00d68f]' : 'text-red-500'
          }`}
        >
          <span
            className={`dot me-1 inline-block h-1.5 w-1.5 rounded ${
              isConnected ? 'bg-[#00d68f]' : 'bg-red-500'
            }`}
          />

          {isConnected
            ? 'Alerts stream connected'
            : 'Alerts stream disconnected'}
        </p>
        <Link
          to="/legal"
          className="text-[10px] text-vigil-muted hover:text-gray-300 block mt-2"
        >
          Privacy · Terms
        </Link>
      </div>
    </div>
  );
}
