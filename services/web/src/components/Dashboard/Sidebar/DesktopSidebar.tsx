import type { AlertsStreamStatus } from '../../../hooks/useAlertsWebSocket';
import Sidebar from './Sidebar';

interface Data {
  status: AlertsStreamStatus;
  onRetry: () => void;
}

export default function DesktopSidebar({ status, onRetry }: Data) {
  return (
    <aside className="hidden lg:block sticky top-0 h-screen">
      <Sidebar status={status} onRetry={onRetry} />
    </aside>
  );
}
