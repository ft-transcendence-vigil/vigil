import Logo from '../../shared/Logo';
import SidebarSection from './SidebarSection';

export default function Sidebar() {
  return (
    <div className="sidebar h-screen bg-vigil-surface w-50 md:w-65 py-3 md:py-4 border-r border-r-vigil-border flex flex-col">
      <Logo className="md:text-2xl px-4 md:px-5 mx-auto!" />
      <div className="sidebar-items border-y border-y-vigil-border py-4 my-4 flex-1">
        <SidebarSection
          title="monitor"
          links={[
            { label: 'overview', path: '/overview' },
            { label: 'alerts', path: '/alerts' },
            { label: 'status', path: '/status' },
          ]}
        />
        <SidebarSection
          title="telemetry"
          links={[
            { label: 'logs', path: '/logs' },
            { label: 'metrics', path: '/metrics' },
            { label: 'traces', path: '/traces' },
          ]}
        />
        <SidebarSection
          title="intelligence"
          links={[{ label: 'AI insights', path: '/ai-insights' }]}
        />
        <SidebarSection
          title="configure"
          links={[
            { label: 'services', path: '/services' },
            { label: 'alert rules', path: '/alert-rules' },
            { label: 'settings', path: '/settings' },
          ]}
        />
      </div>
      <div className="footer px-3 md:px-7 text-[10px] md:text-[12px]">
        <div className="client-info flex justify-between items-center">
          <h6 className="client-mail text-[#ffffffd0]">alex.dev@vigil.io</h6>
          <h6 className="flex justify-center items-center font-bold client-role text-[7px] md:text-[9px] bg-[#2195f310] uppercase px-1 py-0.5 text-vigil-blue border">
            admin
          </h6>
        </div>
        <h6 className="ws-stream text-[9px] md:text-[10px] text-[#00d68f] mt-1">
          <span className="dot rounded bg-[#00d68f] w-1.5 h-1.5 inline-block me-1"></span>{' '}
          Alerts stream connected
        </h6>
      </div>
    </div>
  );
}
