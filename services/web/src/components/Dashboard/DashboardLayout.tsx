import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import { useState } from 'react';
import DesktopSidebar from './Sidebar/DesktopSidebar';
import MobileSidebar from './Sidebar/MobileSidebar';
import { getPageTitle } from './Sidebar/navigation';
import AIDrawer from './AIDrawer/AIDrawer';

export default function DashboardLayout() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  return (
    <div className="dashboard-layout flex h-dvh overflow-hidden">
      <DesktopSidebar />
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="dashboard-bg flex min-h-0 min-w-0 flex-1 flex-col bg-vigil-bg">
        <Header
          title={title}
          onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
          onAskAiClick={() => setIsAiOpen(true)}
        />
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 xl:overflow-hidden overflow-x-hidden">
          <Outlet />
        </div>
      </main>
      <AIDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}
