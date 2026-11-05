import Sidebar from './Sidebar';

interface Data {
  isConnected: boolean;
}

export default function DesktopSidebar({ isConnected }: Data) {
  return (
    <aside className="hidden lg:block sticky top-0 h-screen">
      <Sidebar isConnected={isConnected} />
    </aside>
  );
}
