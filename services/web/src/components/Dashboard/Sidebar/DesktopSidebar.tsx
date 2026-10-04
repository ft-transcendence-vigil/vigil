import Sidebar from './Sidebar';

export default function DesktopSidebar() {
  return (
    <aside className="hidden lg:block sticky top-0 h-screen">
      <Sidebar />
    </aside>
  );
}
