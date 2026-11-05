import LogoutButton from '../shared/LogoutButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from '../shared/Button';
import { useNavigate } from 'react-router-dom';
import { faBars } from '@fortawesome/free-solid-svg-icons';
import AlertNotificationsPage from '../../pages/AlertNotifications/AlertNotificationsPage';

interface Data {
  title: string | undefined;
  onMenuClick: () => void;
}

export default function Header({ title, onMenuClick }: Data) {
  const navigate = useNavigate();

  return (
    <div className="header sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-b-vigil-border bg-inherit px-4 py-4 text-center md:px-8 md:py-5 lg:py-4.5">
      <div className="right-section flex items-center">
        <button
          onClick={onMenuClick}
          className="me-5 block cursor-pointer lg:hidden"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
        <h1 className="me-5 text-[18px] font-bold uppercase tracking-wider md:text-2xl lg:text-3xl">
          {title}
        </h1>
      </div>
      <div className="left-section flex items-center gap-4">
        <AlertNotificationsPage />
        <Button
          onClick={() => navigate('/add-service')}
          value="add service"
          className="tracking-wide! font-medium! uppercase! text-[10px]! md:text-[11px]! lg:text-[12.5px]! py-1.75! px-4.25!"
        />
        <LogoutButton />
      </div>
    </div>
  );
}
