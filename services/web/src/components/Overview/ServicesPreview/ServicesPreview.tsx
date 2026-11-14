import ServicesPreviewCard from './ServicesPreviewCard';
import {
  STATE_COLOR,
  type ServiceState,
  type ServiceSummary,
} from '../overviewData';
import { Empty } from '../AlertsPreview/AlertsPreview';

const STATES: ServiceState[] = ['alerting', 'silent', 'degraded', 'healthy'];
const PREVIEW = 5;

const chip =
  'border uppercase text-[10px] sm:text-[11px] tracking-wider h-6.5 sm:h-7.5 px-px md:px-2 cursor-pointer transition-[color, border-color] duration-300';
const chipIdle =
  'border-vigil-border text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80]';
const chipActive = 'border-vigil-blue text-vigil-blue';

// 'issues' = every state but healthy (the services kpi card)
export type ServicesFilter = ServiceState | 'issues' | null;

interface Data {
  services: ServiceSummary[];
  filter: ServicesFilter;
  onFilterChange: (filter: ServicesFilter) => void;
  selected: string | null;
  onSelect: (name: string) => void;
  showAll: boolean;
  onShowAll: (value: boolean) => void;
  isLoading: boolean;
}

export default function ServicesPreview({
  services,
  filter,
  onFilterChange,
  selected,
  onSelect,
  showAll,
  onShowAll,
  isLoading,
}: Data) {
  const count = (state: ServiceState) =>
    services.filter((s) => s.state === state).length;
  const list =
    filter === 'issues'
      ? services.filter((s) => s.state !== 'healthy')
      : filter
        ? services.filter((s) => s.state === filter)
        : services;
  // 6 cards fit, so only collapse when there are more
  const shown =
    showAll || list.length <= PREVIEW + 1 ? list : list.slice(0, PREVIEW);
  const hidden = list.length - shown.length;

  return (
    <div className="flex flex-col h-full min-h-0 border border-vigil-border bg-vigil-card">
      <div className="flex flex-wrap gap-2 justify-between items-center border-b border-vigil-border px-3 sm:px-5 py-3 sticky bg-vigil-card z-39 top-0">
        <h2 className="text-[15px] sm:text-[17px] font-medium tracking-wide">
          Services
          <span className="mono ms-2 text-[11px] text-vigil-muted-extra">
            {services.length}
          </span>
        </h2>
        <div className="flex flex-wrap gap-2 print:hidden">
          {filter === 'issues' && (
            <button
              type="button"
              onClick={() => onFilterChange(null)}
              className={`${chip} ${chipActive}`}
            >
              needs attention ✕
            </button>
          )}
          {STATES.filter((state) => count(state)).map((state) => (
            <button
              key={state}
              type="button"
              aria-pressed={filter === state}
              onClick={() => onFilterChange(filter === state ? null : state)}
              className={`${chip} ${filter === state ? chipActive : chipIdle}`}
            >
              <span
                className={`h-1 w-1 inline-block rounded-full me-3 ${STATE_COLOR[state].bgColor}`}
              ></span>
              {count(state)} {state}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-12 auto-rows-min gap-4 min-h-0 flex-1 mono p-3 sm:p-4 overflow-y-auto scrollbar-vigil">
        {isLoading && services.length === 0 && (
          <div className="col-span-12">
            <Empty>Loading services...</Empty>
          </div>
        )}
        {!isLoading && list.length === 0 && (
          <div className="col-span-12">
            <Empty>No services match this filter.</Empty>
          </div>
        )}
        {shown.map((s) => (
          <ServicesPreviewCard
            key={s.name}
            service={s}
            selected={selected === s.name}
            onClick={() => onSelect(s.name)}
          />
        ))}
        {(hidden > 0 || (showAll && list.length > PREVIEW + 1)) && (
          <button
            type="button"
            onClick={() => onShowAll(!showAll)}
            className="flex flex-col justify-center items-center border border-dotted p-2 border-vigil-border col-span-12 sm:col-span-6 xl:col-span-4 bg-[#0D1425] cursor-pointer hover:border-[#2195f369] transition-[border-color] duration-300 focus:border-vigil-blue"
          >
            {hidden > 0 && <span className="text-2xl">+{hidden}</span>}
            <span className="text-[12px] text-vigil-muted">
              {hidden > 0 ? 'view all' : 'show less'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
