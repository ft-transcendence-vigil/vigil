import FormInput from '../shared/FormInput';

export type Range = '1h' | '24h' | '7d' | '30d' | 'all' | 'custom';

const RANGES: Range[] = ['1h', '24h', '7d', '30d', 'all', 'custom'];

const btnBase =
  'h-6 sm:h-7 min-w-13 sm:min-w-15 grow sm:grow-0 border px-2 uppercase text-[10px] sm:text-[11px] tracking-wider cursor-pointer transition-[color,border-color] duration-300';
const btnIdle =
  'border-vigil-border text-vigil-muted hover:text-vigil-text-hover hover:border-vigil-border-hover';
const btnActive = 'border-vigil-accent text-vigil-accent';
const dateInput =
  'h-6 sm:h-7 border border-vigil-border bg-vigil-card px-2 text-[11px] text-vigil-text outline-none scheme-dark focus:border-vigil-accent';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="uppercase text-[10px] sm:text-[11px] tracking-wider text-vigil-muted-extra">
      {children}
    </span>
  );
}

type Data = {
  range: Range;
  onRangeChange: (r: Range) => void;
  from: string;
  to: string;
  maxDate: string;
  onDatesChange: (from: string, to: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  service: string | null;
  onClearService: () => void;
  onExportLogs: () => void;
  onExportPdf: () => void;
};

export default function GeneralFilter({
  range,
  onRangeChange,
  from,
  to,
  maxDate,
  onDatesChange,
  search,
  onSearchChange,
  service,
  onClearService,
  onExportLogs,
  onExportPdf,
}: Data) {
  // keeps from <= to whichever input changed
  const changeDates = (a: string, b: string) => {
    if (!a || !b) return;
    if (a > b) onDatesChange(b, a);
    else onDatesChange(a, b);
  };

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 print:hidden">
      <div className="order-1 flex w-full flex-wrap items-center gap-2 md:w-auto">
        <Label>range</Label>
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={range === r}
            onClick={() => onRangeChange(r)}
            className={`${btnBase} ${range === r ? btnActive : btnIdle}`}
          >
            {r}
          </button>
        ))}
        {range === 'custom' && (
          <span className="flex items-center gap-2 text-vigil-muted">
            <input
              type="date"
              aria-label="From date"
              className={dateInput}
              value={from}
              max={maxDate}
              onChange={(e) => changeDates(e.target.value, to)}
            />
            →
            <input
              type="date"
              aria-label="To date"
              className={dateInput}
              value={to}
              max={maxDate}
              onChange={(e) => changeDates(from, e.target.value)}
            />
          </span>
        )}
        {service && (
          <button
            type="button"
            title="Clear the service filter"
            onClick={onClearService}
            className={`${btnBase} ${btnActive} normal-case`}
          >
            {service} ✕
          </button>
        )}
      </div>
      <div className="order-2 flex w-full items-center gap-2 md:order-3 xl:order-2 xl:w-auto xl:max-w-sm xl:flex-1">
        <Label>filter</Label>
        <div className="min-w-0 flex-1">
          <FormInput
            type="search"
            placeholder="Search message, service, metric"
            className="w-full border border-vigil-border px-2 py-1.5 text-[11px] sm:text-[14px] outline-none focus:border-vigil-accent"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            error=""
            mb="mb-0"
          />
        </div>
      </div>
      <div className="order-3 flex w-full flex-wrap items-center gap-2 md:order-2 md:ml-auto md:w-auto xl:order-3 xl:ml-0">
        <Label>export</Label>
        <button
          type="button"
          title="Download the filtered logs as CSV"
          onClick={onExportLogs}
          className={`${btnBase} ${btnIdle}`}
        >
          logs
        </button>
        <button
          type="button"
          title="Print or save the dashboard as a PDF"
          onClick={onExportPdf}
          className={`${btnBase} ${btnIdle}`}
        >
          pdf
        </button>
      </div>
    </div>
  );
}
