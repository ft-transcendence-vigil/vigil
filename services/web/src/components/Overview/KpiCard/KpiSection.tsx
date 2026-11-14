import KpiCard from './KpiCard';
import type { AlertFilter } from '../overviewData';

interface Data {
  critical: number;
  warning: number;
  unack: number;
  healthy: number;
  services: number;
  rangeLabel: string;
  alertFilter: AlertFilter;
  issuesOnly: boolean;
  onAlertFilter: (filter: AlertFilter) => void;
  onToggleIssues: () => void;
}

export default function KpiSection({
  critical,
  warning,
  unack,
  healthy,
  services,
  rangeLabel,
  alertFilter,
  issuesOnly,
  onAlertFilter,
  onToggleIssues,
}: Data) {
  return (
    <div className="grid grid-cols-12 gap-5">
      <KpiCard
        state="critical"
        value={critical}
        caption={rangeLabel}
        active={alertFilter === 'critical'}
        onClick={() => onAlertFilter('critical')}
      />
      <KpiCard
        state="warning"
        value={warning}
        caption={rangeLabel}
        active={alertFilter === 'warning'}
        onClick={() => onAlertFilter('warning')}
      />
      <KpiCard
        state="unack"
        value={unack}
        caption="open right now"
        active={alertFilter === 'open'}
        onClick={() => onAlertFilter('open')}
      />
      <KpiCard
        state="healthy"
        value={healthy}
        total={services}
        caption={`${services - healthy} need attention`}
        active={issuesOnly}
        onClick={onToggleIssues}
      />
    </div>
  );
}
