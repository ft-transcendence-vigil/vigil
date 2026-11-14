import { faBell } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Data {
  notificationNumber: number;
  onClick: () => void;
}

export default function AlertNotificationButton({
  notificationNumber,
  onClick,
}: Data) {
  return (
    <button
      onClick={onClick}
      className="relative text-[15px] bg-vigil-card border border-vigil-border w-8.5 h-8.5 text-vigil-muted cursor-pointer hover:text-[#ffffffc2] hover:border-[#ffffff80] transition-[color, border-color] duration-300"
    >
      <FontAwesomeIcon icon={faBell} />
      {notificationNumber > 0 && (
        <span className="absolute -right-2.5 -top-2.5 text-[11px] text-white font-bold bg-red-500 px-0.5 py-px mono rounded-full">
          {notificationNumber}
        </span>
      )}
    </button>
  );
}
