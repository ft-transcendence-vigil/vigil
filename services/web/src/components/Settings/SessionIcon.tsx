import {
  faDesktop,
  faMobileScreenButton,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Data {
  device: string;
  current: boolean;
}

export default function SessionIcon({ device, current }: Data) {
  const icon = device === 'Desktop' ? faDesktop : faMobileScreenButton;
  return (
    <div
      className={`w-12 h-12 md:w-15 md:h-15 text-[20px] md:text-[25px] border flex justify-center items-center me-5 ${current ? 'border-blue-500/40 text-blue-500/60' : 'border-vigil-border text-vigil-muted'}`}
    >
      <FontAwesomeIcon icon={icon} />
    </div>
  );
}
