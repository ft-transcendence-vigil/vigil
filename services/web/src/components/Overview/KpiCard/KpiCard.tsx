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
      className="kpi-card cursor-pointer group focus:border-[#2195f38c] focus:border-t-2 focus:border-t-vigil-blue flex justify-between p-5 bg-vigil-card col-span-3 border border-vigil-border h-45 overflow-hidden hover:border-t-2 hover:border-t-vigil-blue transition-[border-top-width, border-top-color] duration-300"
    >
      <div className="right-section flex flex-col items-start justify-between">
        <h6 className="title uppercase flex items-center text-vigil-muted text-[15px] tracking-wider">
          <KpiCardIcon cardIcon={state} />
          {config.label}
        </h6>
        <div>
          <h6 className="text-[18px] font-medium">{config.slogan}</h6>
          <h6 className="text-vigil-muted text-start mt-0.5 tracking-wider">
            {config.caption}
          </h6>
        </div>
      </div>
      <div className="num space translate-y-16 group-hover:translate-y-4 transition-[translate, color] duration-300">
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
