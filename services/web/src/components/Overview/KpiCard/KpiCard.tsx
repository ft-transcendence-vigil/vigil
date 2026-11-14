import { KPI_CONFIG, type KpiState } from './KpiCardData';
import KpiCardIcon from './KpiCardIcon';

interface Data {
  state: KpiState;
  value: number;
  total?: number;
  caption: string;
  active: boolean;
  onClick: () => void;
}

export default function KpiCard({
  state,
  value,
  total,
  caption,
  active,
  onClick,
}: Data) {
  const config = KPI_CONFIG[state];
  const digits = String(value).length;
  const size =
    digits <= 2 ? 'text-[72px]' : digits === 3 ? 'text-[56px]' : 'text-[42px]';

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${active ? 'border-vigil-accent-border-selected before:opacity-100' : 'border-vigil-border before:opacity-0'} kpi-card cursor-pointer group text-left flex justify-between gap-3 p-5 bg-vigil-card col-span-12 md:col-span-6 xl:col-span-3 border h-45 overflow-hidden relative before:absolute before:w-full before:h-0.5 before:left-0 before:top-0 before:bg-vigil-accent hover:before:opacity-100 focus-visible:before:opacity-100 before:transition-opacity before:duration-300`}
    >
      <div className="right-section flex min-w-0 flex-col items-start justify-between">
        <h6 className="title uppercase flex items-center text-vigil-muted text-[12px] md:text-[13px] lg:text-[14px] xl:text-[15px] tracking-wider">
          <KpiCardIcon cardIcon={state} />
          {config.label}
        </h6>
        <div>
          <h6 className="lg:text-[14px] xl:text-[16px] font-medium">
            {config.slogan}
          </h6>
          <h6 className="lg:text-[12px] xl:text-[14px] text-vigil-muted text-start mt-0.5 tracking-wider">
            {caption}
          </h6>
        </div>
      </div>
      <div
        className={`num space ${size} shrink-0 self-end group-hover:-translate-y-5 transition-[translate, color] duration-300`}
      >
        {value}
        {total !== undefined && (
          <span className="text-[0.5em] text-vigil-muted">/{total}</span>
        )}
      </div>
    </button>
  );
}
