import type { MetricGroup } from './metricData';

interface Data {
  groups: MetricGroup[];
  selected: string[];
  onToggle: (name: string) => void;
}

export default function SeriesPicker({ groups, selected, onToggle }: Data) {
  return (
    <div className="flex flex-wrap gap-2">
      {groups.map((group) => {
        const active = selected.includes(group.name);
        return (
          <button
            key={group.name}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(group.name)}
            className={`mono text-[12px] px-3 py-1.5 border cursor-pointer transition-[color,border-color,background-color] duration-200 ${
              active
                ? 'border-vigil-blue text-white bg-vigil-blue-100'
                : 'border-vigil-border text-vigil-muted hover:border-white/60 hover:text-white/60'
            }`}
          >
            {group.name}
            {group.internal && (
              <span className="ms-2 text-[10px] text-[#f59e0b]">internal</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
