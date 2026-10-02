import AIPanel from './AIPanel';

interface Data {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIDrawer({ isOpen, onClose }: Data) {
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 w-100 bg-vigil-surface transition-transform duration-300 border-s border-s-vigil-border ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <AIPanel onClose={onClose} />
    </aside>
  );
}
