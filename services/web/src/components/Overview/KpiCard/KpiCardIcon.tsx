import {
  faArrowTrendUp,
  faFire,
  faServer,
  faUserClock,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { KpiState } from './KpiCardData';

const ICONS: Record<KpiState, { icon: IconDefinition; color: string }> = {
  critical: { icon: faFire, color: 'bg-vigil-state-danger/15 text-vigil-state-danger-text' },
  warning: { icon: faArrowTrendUp, color: 'bg-vigil-state-attention/15 text-vigil-state-attention-text' },
  unack: { icon: faUserClock, color: 'bg-vigil-state-info/15 text-vigil-state-info-text' },
  healthy: { icon: faServer, color: 'bg-vigil-state-success/15 text-vigil-state-success-text' },
};

interface Data {
  cardIcon: KpiState;
}

export default function KpiCardIcon({ cardIcon }: Data) {
  const { icon, color } = ICONS[cardIcon];
  return (
    <FontAwesomeIcon
      className={`p-2 text-[11px] me-3 w-3! h-3! ${color}`}
      icon={icon}
    />
  );
}
