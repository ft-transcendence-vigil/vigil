export type Tab = 'all' | 'unseen';

interface Data {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { label: string; value: Tab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unseen', value: 'unseen' },
];

export default function AlertNotificationsTabs({ tab, onChange }: Data) {
  return (
    <div className="mt-2.5 flex gap-4 border-b border-vigil-border px-4">
      {tabs.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`-mb-px cursor-pointer border-b-2 py-2 text-[.8rem] transition-colors ${
            tab === value
              ? 'border-vigil-blue text-white'
              : 'border-transparent text-vigil-muted-extra hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
