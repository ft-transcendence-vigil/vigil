import { useState } from 'react';
import type { Period } from '../../api/metricsApi';
import SwitchButton from '../shared/SwitchButton';

interface Data {
  period: Period;
  service: string;
  live: boolean;
  liveState: 'paused' | 'connecting' | 'live' | 'failed';
  isExporting: boolean;
  onPeriodChange: (period: Period) => void;
  onServiceChange: (service: string) => void;
  onLiveChange: () => void;
  onExport: () => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: '1h', label: 'Last 1h' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7d' },
  { value: '30d', label: 'Last 30d' },
];

const LIVE_LABELS = {
  paused: { text: 'Paused' },
  connecting: { text: 'Connecting…' },
  live: { text: 'Live' },
  failed: { text: 'Disconnected' },
};

const selectClass =
  'capitalize outline-none px-4 py-3 w-full min-w-0 border border-vigil-border focus:border-vigil-blue bg-[#0D1425]';
const inputClass =
  'placeholder:text-vigil-muted-extra outline-none px-4 py-2.5 w-full min-w-0 border border-vigil-border focus:border-vigil-blue bg-[#0D1425]';

export default function MetricsFilters({
  period,
  service,
  live,
  liveState,
  isExporting,
  onPeriodChange,
  onServiceChange,
  onLiveChange,
  onExport,
}: Data) {
  const [draft, setDraft] = useState(service);
  const label = LIVE_LABELS[liveState];

  const applyService = () => {
    if (draft.trim() !== service) onServiceChange(draft.trim());
  };

  return (
    <div className="mb-9">
      <div className="flex justify-between items-center mb-7">
        <div className="flex items-center space-x-4">
          <SwitchButton checked={live} onCheckedChange={onLiveChange} />
          <span className="text-2xl text-vigil-muted">{label.text}</span>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className="text-[12px] md:text-[13px] cursor-pointer border border-vigil-border py-3 px-5 text-vigil-muted hover:border-white/60 hover:text-white/60 transition-[color,border-color] duration-300"
        >
          {isExporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-center">
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as Period)}
          className={selectClass}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value} className="bg-vigil-card">
              {p.label}
            </option>
          ))}
        </select>
        <form
          className="min-w-0"
          onSubmit={(e) => {
            e.preventDefault();
            applyService();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={applyService}
            placeholder="Service"
            className={inputClass}
          />
        </form>
      </div>
    </div>
  );
}
