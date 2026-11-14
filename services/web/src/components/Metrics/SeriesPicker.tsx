import type { MetricGroup } from './metricData';

interface Data {
  groups: MetricGroup[];
  selected: string[];
  onToggle: (name: string) => void;
}
//draw series buttons
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
              //if active do the hovered color
              active
                ? 'border-vigil-accent text-vigil-text bg-vigil-accent-soft'
                : 'border-vigil-border text-vigil-muted hover:border-vigil-text/60 hover:text-vigil-text/60'
            }`}
          >
            {group.name}
          </button>
        );
      })}
    </div>
  );
}
