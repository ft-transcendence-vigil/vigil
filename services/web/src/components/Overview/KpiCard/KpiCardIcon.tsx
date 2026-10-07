import {
  faCircleDot,
  faExclamation,
  faHeart,
  faTriangleExclamation,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Data {
  cardIcon: string;
}

export default function KpiCardIcon({ cardIcon }: Data) {
  function getIcon(): IconDefinition {
    if (cardIcon === 'critical') return faExclamation;
    else if (cardIcon === 'warning') return faTriangleExclamation;
    else if (cardIcon === 'unack') return faCircleDot;
    return faHeart;
  }

  return (
    <FontAwesomeIcon
      className="p-2 text-[11px] me-3 bg-blue-500/20 text-blue-500"
      icon={getIcon()}
    />
  );
}
