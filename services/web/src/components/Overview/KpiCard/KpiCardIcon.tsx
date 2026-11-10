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
  critical: { icon: faFire, color: 'bg-red-500/15 text-red-400' },
  warning: { icon: faArrowTrendUp, color: 'bg-amber-500/15 text-amber-400' },
  unack: { icon: faUserClock, color: 'bg-blue-500/15 text-blue-400' },
  healthy: { icon: faServer, color: 'bg-green-500/15 text-green-400' },
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
