import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import { useState } from 'react';
import DesktopSidebar from './Sidebar/DesktopSidebar';
import MobileSidebar from './Sidebar/MobileSidebar';
import AIDrawer from './AI/AIDrawer';
import { getPageTitle } from './Sidebar/navigation';

export default function DashboardLayout() {
  const location = useLocation();
  const title = getPageTitle(location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  return (
    <div className="dashboard-layout flex min-h-screen">
      <DesktopSidebar />
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="dashboard-bg flex-1 bg-vigil-bg">
        <Header
          title={title}
          onMenuClick={() => setIsSidebarOpen((prev) => !prev)}
          onAskAiClick={() => setIsAiOpen(true)}
        />
        <div className="py-6 px-8">
          <Outlet />
        </div>
      </main>
      <AIDrawer isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} />
    </div>
  );
}
