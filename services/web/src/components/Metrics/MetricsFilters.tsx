import { useState } from 'react';
import type { Period } from '../../api/metricsApi';
import SwitchButton from '../shared/SwitchButton';

interface Data {
  period: Period;
  service: string;
  services: string[];
  showInternal: boolean;
  live: boolean;
  liveState: 'paused' | 'connecting' | 'live' | 'failed';
  isExporting: boolean;
  onPeriodChange: (period: Period) => void;
  onServiceChange: (service: string) => void;
  onShowInternalChange: (showInternal: boolean) => void;
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
  paused: { text: 'Paused', dot: 'bg-[#4a5d7e]' },
  connecting: { text: 'Connecting…', dot: 'bg-[#f59e0b]' },
  live: { text: 'Live', dot: 'bg-[#00d68f] animate-pulse' },
  failed: { text: 'Disconnected', dot: 'bg-[#ff4757]' },
};

const fieldClass =
  'outline-none px-3 py-2 text-[13px] bg-vigil-card border border-vigil-border focus:border-vigil-blue';

export default function MetricsFilters({
  period,
  service,
  services,
  showInternal,
  live,
  liveState,
  isExporting,
  onPeriodChange,
  onServiceChange,
  onShowInternalChange,
  onLiveChange,
  onExport,
}: Data) {
  const [draft, setDraft] = useState(service);
  const label = LIVE_LABELS[liveState];

  const applyService = () => {
    if (draft.trim() !== service) onServiceChange(draft.trim());
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={period}
        onChange={(e) => onPeriodChange(e.target.value as Period)}
        className={fieldClass}
      >
        {PERIODS.map((p) => (
          <option key={p.value} value={p.value} className="bg-vigil-card">
            {p.label}
          </option>
        ))}
      </select>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyService();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={applyService}
          list="metrics-services"
          placeholder="All services"
          className={`${fieldClass} w-40`}
        />
        <datalist id="metrics-services">
          {services.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </form>
      <label className="flex items-center gap-2 text-[13px] text-vigil-muted cursor-pointer">
        <input
          type="checkbox"
          checked={showInternal}
          onChange={(e) => onShowInternalChange(e.target.checked)}
          className="h-3.5 w-3.5 accent-[#2196F3] cursor-pointer"
        />
        Show internal infra metrics
      </label>
      <div className="flex items-center gap-2 text-[12px] text-vigil-muted uppercase tracking-wider">
        <SwitchButton checked={live} onCheckedChange={onLiveChange} />
        <span className={`inline-block w-1.5 h-1.5 rounded ${label.dot}`} />
        {label.text}
      </div>
      <button
        type="button"
        onClick={onExport}
        disabled={isExporting}
        className="ms-auto text-[12px] md:text-[13px] cursor-pointer border border-vigil-border px-4 h-9 text-vigil-muted hover:border-white/60 hover:text-white/60 transition-[color,border-color] duration-200"
      >
        {isExporting ? 'Exporting…' : '↓ CSV export'}
      </button>
    </div>
  );
}
