import FormInput from '../shared/FormInput';

export type Range = '1h' | '24h' | '7d' | '30d' | 'all' | 'custom';

const RANGES: Range[] = ['1h', '24h', '7d', '30d', 'all', 'custom'];

const btnBase =
  'h-6 sm:h-7 min-w-13 sm:min-w-15 grow sm:grow-0 border px-2 uppercase text-[10px] sm:text-[11px] tracking-wider cursor-pointer transition-[color,border-color] duration-300';
const btnIdle =
  'border-vigil-border text-vigil-muted hover:text-[#ffffffc2] hover:border-[#ffffff80]';
const btnActive = 'border-vigil-blue text-vigil-blue';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="uppercase text-[10px] sm:text-[11px] tracking-wider text-vigil-muted-extra">
      {children}
    </span>
  );
}

type Data = {
  range?: Range;
  onRangeChange?: (r: Range) => void;
};

export default function GeneralFilter({ range = '24h', onRangeChange }: Data) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="order-1 flex w-full flex-wrap items-center gap-2 md:w-auto">
        <Label>range</Label>
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => onRangeChange?.(r)}
            className={`${btnBase} ${range === r ? btnActive : btnIdle}`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="order-2 flex w-full items-center gap-2 md:order-3 xl:order-2 xl:w-auto xl:max-w-sm xl:flex-1">
        <Label>filter</Label>
        <div className="min-w-0 flex-1">
          <FormInput
            type="text"
            placeholder="Search message, service, metric"
            className="w-full border border-vigil-border px-2 py-1.5 text-[11px] sm:text-[14px] outline-none focus:border-vigil-blue"
            error=""
            mb="mb-0"
          />
        </div>
      </div>
      <div className="order-3 flex w-full flex-wrap items-center gap-2 md:order-2 md:ml-auto md:w-auto xl:order-3 xl:ml-0">
        <Label>export</Label>
        <button type="button" className={`${btnBase} ${btnIdle}`}>
          logs
        </button>
        <button type="button" className={`${btnBase} ${btnIdle}`}>
          pdf
        </button>
      </div>
    </div>
  );
}
