import { KPI_CONFIG, type KpiState } from './KpiCardData';
import KpiCardIcon from './KpiCardIcon';

interface Data {
  state: KpiState;
  value: string | number;
}

export default function KpiCard({ state, value }: Data) {
  const config = KPI_CONFIG[state];
  return (
    <button
      type="button"
      className="kpi-card cursor-pointer group focus:border-[#2195f38c] focus:border-t-2 focus:border-t-vigil-blue flex justify-between p-5 bg-vigil-card col-span-12 md:col-span-6 xl:col-span-3 border border-vigil-border h-45 overflow-hidden relative before:absolute before:w-full before:h-0.5 before:opacity-0 before:left-0 before:top-0 before:bg-vigil-blue hover:before:opacity-100 before:transition-opacity before:duration-300"
    >
      <div className="right-section flex flex-col items-start justify-between">
        <h6 className="title uppercase flex items-center text-vigil-muted text-[12px] md:text-[13px] lg:text-[14px] xl:text-[15px] tracking-wider">
          <KpiCardIcon cardIcon={state} />
          {config.label}
        </h6>
        <div>
          <h6 className="lg:text-[14px] xl:text-[16px] font-medium">
            {config.slogan}
          </h6>
          <h6 className="lg:text-[12px] xl:text-[14px] text-vigil-muted text-start mt-0.5 tracking-wider">
            {config.caption}
          </h6>
        </div>
      </div>
      <div className="num space text-[105px] translate-y-19 group-hover:translate-y-5 transition-[translate, color] duration-300">
        {state === 'healthy' ? (
          <>
            8<span className="text-6xl">/14</span>
          </>
        ) : (
          value
        )}
      </div>
    </button>
  );
}
