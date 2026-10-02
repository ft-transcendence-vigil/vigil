import { faBars } from '@fortawesome/free-solid-svg-icons';
import AskAIButton from '../shared/AskAIButton';
import LogoutButton from '../shared/LogoutButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface Data {
  title: string;
  onMenuClick: () => void;
  onAskAiClick: () => void;
}

export default function Header({ title, onMenuClick, onAskAiClick }: Data) {
  return (
    <div className="header sticky top-0 bg-inherit text-center border-b border-b-vigil-border flex justify-between items-center py-4 md:py-5 lg:py-4.5 px-4 md:px-8">
      <div className="right-section flex items-center">
        <button
          onClick={onMenuClick}
          className="block md:hidden me-5 cursor-pointer"
        >
          <FontAwesomeIcon icon={faBars} />
        </button>
        <h1 className="me-5 text-[18px] md:text-2xl lg:text-3xl tracking-wide">{title}</h1>
        <div className="flex rounded-full justify-center items-center uppercase text-[7px] md:text-[8px] lg:text-[10px] font-bold tracking-wider px-2 h-5 border border-[#00d68f75] text-[#00d68f] bg-[#00d68f2b]">
          <span className="dot rounded w-1 h-1 md:w-1.5 md:h-1.5 bg-[#00d68f] inline-block me-1"></span>
          live stream
        </div>
      </div>
      <div className="left-section space-x-3">
        <AskAIButton onClick={onAskAiClick} />
        <LogoutButton />
      </div>
    </div>
  );
}
