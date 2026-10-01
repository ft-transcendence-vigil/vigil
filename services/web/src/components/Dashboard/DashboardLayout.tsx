import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar/Sidebar';

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
  return (
    <div className="dashboard-layout flex min-h-screen">
      <aside className="sticky top-0 h-screen">
        <Sidebar />
      </aside>
      <main className="dashboard-bg flex-1 bg-vigil-bg">
        <Header title={title} />
        <div className="py-6 px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
