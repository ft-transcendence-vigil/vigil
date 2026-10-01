import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar/Sidebar';
import { useState } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/overview': 'Overview',
  '/alerts': 'Alerts',
  '/status': 'Status',
  '/logs': 'Logs',
  '/metrics': 'Metrics',
  '/traces': 'Traces',
  '/ai-insights': 'AI Insights',
  '/services': 'Services',
  '/alert-rules': 'Alert Rules',
  '/settings': 'Settings',
};

export default function DashboardLayout() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'Vigil';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const onMenuClick = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="dashboard-layout flex min-h-screen">
      <aside className="hidden md:block sticky top-0 h-screen">
        <Sidebar />
      </aside>
      <button
        type="button"
        aria-label="Close sidebar"
        onClick={() => setIsSidebarOpen(false)}
        className={`fixed inset-0 bg-[#050810b3] z-40 transition-opacity duration-300 md:hidden ${isSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        className={`fixed z-50 inset-y-0 left-0 h-screen transition-transform duration-300 md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar />
      </aside>
      <main className="dashboard-bg flex-1 bg-vigil-bg">
        <Header title={title} onMenuClick={onMenuClick} />
        <div className="py-6 px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
