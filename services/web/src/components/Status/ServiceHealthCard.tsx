import type { ServiceHealth } from '../../hooks/useStatus';
import { THRESHOLDS } from '../../hooks/useStatus';
import { formatDuration, timeAgo } from '../shared/utils/format';
import { healthColors } from './healthColors';

interface Data {
  service: ServiceHealth;
}

function levelClass(value: number, warn: number, crit: number) {
  if (value > crit) return 'text-[#ff4757]';
  if (value > warn) return 'text-[#f59e0b]';
  return '';
}

export default function ServiceHealthCard({ service }: Data) {
  const colors = healthColors[service.health];

  return (
    <div
      className={`flex flex-col bg-[#0D1425] border ${colors.border} p-3 sm:p-4`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className={`h-2 w-2 shrink-0 rounded-full ${colors.dot}`} />
        <span className="text-[14px] flex-1 truncate">{service.name}</span>
        <span className={`text-[11px] uppercase tracking-wide ${colors.text}`}>
          {colors.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 mono mb-2">
        <div>
          <div className="text-[10px] text-vigil-muted uppercase">p95</div>
          <div
            className={`text-[14px] ${levelClass(service.p95, THRESHOLDS.degraded.p95, THRESHOLDS.down.p95)}`}
          >
            {formatDuration(service.p95)}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-vigil-muted uppercase">Errors</div>
          <div
            className={`text-[14px] ${levelClass(service.errorRate, THRESHOLDS.degraded.errorRate, THRESHOLDS.down.errorRate)}`}
          >
            {service.errorRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] text-vigil-muted uppercase">Spans</div>
          <div className="text-[14px]">
            {service.spansPerMin.toFixed(service.spansPerMin < 10 ? 1 : 0)}
            /min
          </div>
        </div>
      </div>
      <div className="text-[11px] text-vigil-muted-extra mt-1">
        Last span {timeAgo(service.lastSeen).toLowerCase()}
      </div>
    </div>
  );
}
