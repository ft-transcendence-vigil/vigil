import Logo from '../../shared/Logo';
import SidebarSection from './SidebarSection';

export default function Sidebar() {
  return (
    <div className="sidebar bg-vigil-surface h-screen w-65 py-4 border-r flex flex-col">
      <Logo className="text-2xl px-5 mx-auto!" />
      <div className="sidebar-items border-y border-y-vigil-border py-4 my-4 flex-1">
        <SidebarSection
          title="monitor"
          links={['overview', 'alerts', 'status']}
        />
        <SidebarSection
          title="telemetry"
          links={['logs', 'metrics', 'traces']}
        />
        <SidebarSection title="intelligence" links={['AI insights']} />
        <SidebarSection title="configure" links={['alert rules', 'settings']} />
      </div>
      <div className="footer px-7 text-[11px]">
        <div className="client-info flex justify-between items-center">
          <h6 className="client-mail text-[#ffffffd0]">alex.dev@vigil.io</h6>
          <h6 className="client-role bg-[#2195f310] uppercase px-1 py-0.5 text-vigil-blue border">
            admin
          </h6>
        </div>
        <h6 className="ws-stream text-[10px] text-[#00d68f] mt-1">
          <span className="dot rounded bg-[#00d68f] w-1.5 h-1.5 inline-block me-1"></span>{' '}
          Alerts stream connected
        </h6>
      </div>
    </div>
  );
}
