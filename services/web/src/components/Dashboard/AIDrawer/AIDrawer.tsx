import { useAIDrawer } from '../../../hooks/useAIDrawer';
import AIPanel from './AIPanel';

export default function AIDrawer() {
  const { alertId, closeAI } = useAIDrawer();
  const isOpen = alertId !== null;

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 w-100 md:w-130 bg-vigil-surface transition-transform duration-300 border-s border-s-vigil-border ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {alertId && <AIPanel key={alertId} onClose={closeAI} />}
    </aside>
  );
}
